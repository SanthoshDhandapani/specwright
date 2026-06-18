// ---------------------------------------------------------------------------
// Specwright E2E + Coverage — generic Jenkins declarative pipeline (TEMPLATE)
//
// A starting point for running playwright-bdd E2E tests with V8 code coverage
// in CI. It is intentionally tool-agnostic and carries no project-, host-, or
// vendor-specific values — fill in the parameters and (optionally) APP_START_CMD
// for your app, then point a Jenkins Pipeline job at this file.
//
// What it does:
//   1. Checks out the chosen branch
//   2. Installs dependencies (auto-detects pnpm / yarn / npm from the lockfile)
//   3. Optionally starts your dev server and waits for it to come up
//   4. Runs the E2E suite — with coverage when RUN_COVERAGE is true
//   5. Builds the coverage reports (executed-only + full-tree Istanbul)
//   6. Publishes and archives the HTML reports
//
// Coverage note: accurate coverage needs source maps, which dev servers serve
// but deployed builds usually strip. Point BASE_URL at a localhost dev server
// (started here via APP_START_CMD, or already running) for real source-level
// numbers. See e2e-tests/.env.testing → ENABLE_COVERAGE / COVERAGE_EXCLUDE.
// ---------------------------------------------------------------------------

pipeline {
    agent {
        docker {
            // Official Playwright image ships the browsers + system deps.
            // Pin the tag to match the `@playwright/test` version in package.json.
            image 'mcr.microsoft.com/playwright:v1.49.0-jammy'
            args '-u root:root'
        }
    }

    parameters {
        string(name: 'BRANCH', defaultValue: 'main', description: 'Git branch to check out and test')
        string(name: 'BASE_URL', defaultValue: 'http://localhost:3000', description: 'Application URL under test. Use a localhost dev server for accurate coverage source maps.')
        string(name: 'WORKERS', defaultValue: '4', description: 'Number of parallel Playwright workers')
        string(name: 'GREP', defaultValue: '', description: 'Optional Playwright --grep tag filter (e.g. @smoke). Leave blank to run the full suite.')
        booleanParam(name: 'RUN_COVERAGE', defaultValue: true, description: 'Collect V8 code coverage and build the coverage reports')
        text(name: 'APP_START_CMD', defaultValue: '', description: 'Optional command to start the app/dev server in the background before tests (e.g. "pnpm dev"). Leave blank if BASE_URL is already serving.')
    }

    environment {
        CI = 'true'
        // V8 coverage + source-map fetching is memory-heavy on bundlers with
        // many chunks; give Node room so the merge does not OOM.
        NODE_OPTIONS = '--max-old-space-size=8192'
        PLAYWRIGHT_HTML_OPEN = 'never'
        ENABLE_COVERAGE = "${params.RUN_COVERAGE}"
        BASE_URL = "${params.BASE_URL}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: params.BRANCH]],
                    userRemoteConfigs: scm.userRemoteConfigs
                ])
                sh 'git log --oneline -3 || true'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    set -e
                    corepack enable || true
                    if [ -f "pnpm-lock.yaml" ]; then
                        echo "Using pnpm (pnpm-lock.yaml found)"
                        pnpm install --frozen-lockfile
                    elif [ -f "yarn.lock" ]; then
                        echo "Using yarn (yarn.lock found)"
                        yarn install --frozen-lockfile
                    elif [ -f "package-lock.json" ]; then
                        echo "Using npm (package-lock.json found)"
                        npm ci
                    else
                        echo "No lockfile found — using npm install"
                        npm install
                    fi
                    npx playwright --version
                '''
            }
        }

        stage('Start App') {
            when { expression { params.APP_START_CMD?.trim() } }
            steps {
                sh '''
                    set -e
                    echo "Starting app: ${APP_START_CMD}"
                    nohup sh -c "${APP_START_CMD}" > app-server.log 2>&1 &
                    echo "Waiting for ${BASE_URL} to respond..."
                    for i in $(seq 1 60); do
                        if curl -sf -o /dev/null "${BASE_URL}"; then
                            echo "App is up."
                            exit 0
                        fi
                        sleep 5
                    done
                    echo "App did not become reachable at ${BASE_URL}"; tail -50 app-server.log || true; exit 1
                '''
            }
        }

        stage('Run E2E Tests') {
            steps {
                script {
                    def pm = sh(script: '''
                        if [ -f pnpm-lock.yaml ]; then echo pnpm;
                        elif [ -f yarn.lock ]; then echo yarn;
                        else echo npm; fi
                    ''', returnStdout: true).trim()
                    def runner = (pm == 'npm') ? 'npm run' : pm

                    if (params.RUN_COVERAGE) {
                        // run-coverage.js sets ENABLE_COVERAGE, runs bddgen + the
                        // coverage projects, and writes raw V8 data to .raw-coverage/.
                        sh "set +e; ${runner} test:e2e:coverage; echo \$? > .test-exit-code; set -e; exit 0"
                    } else {
                        def grepArg = params.GREP?.trim() ? "--grep '${params.GREP}'" : ''
                        sh """
                            set +e
                            npx bddgen
                            npx playwright test --workers ${params.WORKERS} ${grepArg}
                            echo \$? > .test-exit-code
                            set -e
                            exit 0
                        """
                    }
                }
            }
        }

        stage('Coverage Reports') {
            when { expression { params.RUN_COVERAGE } }
            steps {
                // Call the report scripts directly (the package.json
                // `:report:*` scripts end in `open`, which is a no-op in CI).
                sh '''
                    set +e
                    node --max-old-space-size=16384 --expose-gc e2e-tests/scripts/merge-coverage.js
                    node e2e-tests/scripts/coverage-expand.mjs
                    node e2e-tests/scripts/coverage-istanbul.mjs
                    set -e
                    exit 0
                '''
            }
        }

        stage('Publish & Archive') {
            steps {
                archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
                archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
                script {
                    if (fileExists('reports/playwright/index.html')) {
                        publishHTML([
                            allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true,
                            reportDir: 'reports/playwright', reportFiles: 'index.html',
                            reportName: 'E2E Test Report'
                        ])
                    }
                    if (params.RUN_COVERAGE && fileExists('reports/coverage-istanbul/index.html')) {
                        publishHTML([
                            allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true,
                            reportDir: 'reports/coverage-istanbul', reportFiles: 'index.html',
                            reportName: 'Coverage Report'
                        ])
                    }
                }
            }
        }

        stage('Finalize') {
            steps {
                script {
                    def exitCode = sh(script: "cat .test-exit-code 2>/dev/null || echo 1", returnStdout: true).trim()
                    if (exitCode != '0') {
                        echo "Test failures detected (exit code: ${exitCode})."
                        currentBuild.result = 'UNSTABLE'
                    } else {
                        echo "All tests passed."
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline finished — branch: ${params.BRANCH}, BASE_URL: ${params.BASE_URL}, coverage: ${params.RUN_COVERAGE}"
        }
    }
}
