/**
 * electron-builder beforePack hook — downloads the uv + uvx binaries for the
 * current build platform into bin/ so extraResources can bundle them into the app.
 *
 * uvx is not standalone — it requires the uv binary in the same directory.
 * Both are extracted from the same archive.
 *
 * uv ships prebuilt binaries for all platforms via GitHub Releases.
 * Users never need to install Python or uv themselves.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const UV_VERSION = "0.7.6";

const PLATFORM_ASSETS = {
  "darwin-arm64": { archive: "uv-aarch64-apple-darwin.tar.gz",     binaries: ["uv", "uvx"],           tar: true  },
  "darwin-x64":   { archive: "uv-x86_64-apple-darwin.tar.gz",      binaries: ["uv", "uvx"],           tar: true  },
  "win32-x64":    { archive: "uv-x86_64-pc-windows-msvc.zip",      binaries: ["uv.exe", "uvx.exe"],   tar: false },
  "linux-x64":    { archive: "uv-x86_64-unknown-linux-gnu.tar.gz", binaries: ["uv", "uvx"],           tar: true  },
};

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("Too many redirects"));
    https.get(url, { headers: { "User-Agent": "specwright-build" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(download(res.headers.location, dest, redirects + 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
      file.on("error", reject);
    }).on("error", reject);
  });
}

exports.default = async function downloadUv() {
  const platformKey = `${process.platform}-${process.arch}`;
  const asset = PLATFORM_ASSETS[platformKey];

  if (!asset) {
    console.warn(`[uv] Unsupported platform ${platformKey} — skipping`);
    return;
  }

  const binDir = path.join(__dirname, "..", "bin");
  const allPresent = asset.binaries.every(b => fs.existsSync(path.join(binDir, b)));

  if (allPresent) {
    console.log(`[uv] Binaries already present — skipping download`);
    return;
  }

  fs.mkdirSync(binDir, { recursive: true });

  const url = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/${asset.archive}`;
  const tmpArchive = path.join(os.tmpdir(), asset.archive);

  console.log(`[uv] Downloading uv ${UV_VERSION} for ${platformKey}...`);
  await download(url, tmpArchive);
  console.log(`[uv] Extracting ${asset.binaries.join(", ")}...`);

  if (asset.tar) {
    const patterns = asset.binaries.map(b => `"*/${b}"`).join(" ");
    execSync(
      `tar -xzf "${tmpArchive}" --strip-components=1 -C "${binDir}" ${patterns}`,
      { stdio: "pipe" }
    );
  } else {
    const extractDir = path.join(os.tmpdir(), "uv-extract");
    execSync(
      `powershell -Command "Expand-Archive -Path '${tmpArchive}' -DestinationPath '${extractDir}' -Force"`,
      { stdio: "pipe" }
    );
    for (const binary of asset.binaries) {
      fs.copyFileSync(path.join(extractDir, binary), path.join(binDir, binary));
    }
  }

  for (const binary of asset.binaries) {
    const p = path.join(binDir, binary);
    if (fs.existsSync(p)) fs.chmodSync(p, 0o755);
  }

  fs.unlinkSync(tmpArchive);
  console.log(`[uv] Ready: ${asset.binaries.map(b => path.join(binDir, b)).join(", ")}`);
};
