import { execSync } from 'child_process';
import path from 'path';

/**
 * Execute a shell command in the project root directory.
 * @param {string} command — Shell command to run
 * @param {object} options — { timeout?, cwd? }
 * @returns {{ stdout: string, stderr: string, exitCode: number }}
 */
export function exec(command, options = {}) {
  const projectRoot = options.cwd || path.resolve(process.cwd());
  const timeout = options.timeout || 120000;

  try {
    const stdout = execSync(command, {
      cwd: projectRoot,
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    return { stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (error) {
    return {
      stdout: (error.stdout || '').trim(),
      stderr: (error.stderr || '').trim(),
      exitCode: error.status || 1,
    };
  }
}
