#!/usr/bin/env node
/**
 * For each untouched file in /tmp/gaps.txt, check whether any other src/ file
 * imports it. Files with zero imports are dead code (not a coverage gap).
 */
import fs from "fs";
import path from "path";

const SRC = path.resolve("src");
const gapsList = fs.readFileSync("/tmp/gaps.txt", "utf8").split("\n").filter(Boolean);

// Build one big in-memory import index: scan every .js/.jsx/.ts/.tsx file
// in src/ once, extract all import specifiers.
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/(node_modules|__tests__|__mocks__)/.test(p)) continue;
      yield* walk(p);
    } else if (/\.(jsx?|tsx?)$/.test(e.name) && !/\.(test|spec|stories)\./.test(e.name)) {
      yield p;
    }
  }
}

const importRe = /(?:^|[^\w])(?:import|require)\s*\(?[^'"]*['"]([^'"]+)['"]/g;
const allImports = new Set();
const importerBySpec = new Map();

let scanned = 0;
for (const file of walk(SRC)) {
  scanned++;
  const text = fs.readFileSync(file, "utf8");
  let m;
  while ((m = importRe.exec(text)) !== null) {
    const spec = m[1];
    if (!spec.startsWith(".") && !spec.startsWith("modules/") && !spec.startsWith("components/")
        && !spec.startsWith("utils/") && !spec.startsWith("hooks/") && !spec.startsWith("redux/")
        && !spec.startsWith("auth/") && !spec.startsWith("constants/") && !spec.startsWith("features/")
        && !spec.startsWith("next-gen/") && !spec.startsWith("context/") && !spec.startsWith("providers/")) continue;
    allImports.add(spec);
    if (!importerBySpec.has(spec)) importerBySpec.set(spec, []);
    importerBySpec.get(spec).push(path.relative(".", file));
  }
}
console.log(`Scanned ${scanned} source files, collected ${allImports.size} unique import specs.`);

// For each untouched file, build the canonical absolute spec (e.g. "modules/dashboard/DashboardView")
// and check if any import resolves to it.
function specForFile(f) {
  const rel = f.replace(/^src\//, "").replace(/\.(jsx?|tsx?)$/, "").replace(/\/index$/, "");
  return rel;
}

function resolveImport(importer, spec) {
  // resolve to "src/..."-relative path without extension
  let resolved;
  if (spec.startsWith(".")) {
    const dir = path.dirname(importer);
    resolved = path.resolve(dir, spec);
  } else {
    resolved = path.resolve("src", spec);
  }
  // Try as file or index
  for (const ext of [".js", ".jsx", ".ts", ".tsx"]) {
    if (fs.existsSync(resolved + ext)) return path.relative(".", resolved + ext);
  }
  for (const ext of [".js", ".jsx", ".ts", ".tsx"]) {
    if (fs.existsSync(path.join(resolved, "index" + ext))) return path.relative(".", path.join(resolved, "index" + ext));
  }
  return null;
}

// Build a reverse map: resolved-file → list of files that import it
const importedBy = new Map();
for (const [spec, importers] of importerBySpec) {
  for (const imp of importers) {
    const resolved = resolveImport(imp, spec);
    if (!resolved) continue;
    if (!importedBy.has(resolved)) importedBy.set(resolved, []);
    importedBy.get(resolved).push(imp);
  }
}

let dead = 0;
let imported = 0;
const deadList = [];
for (const f of gapsList) {
  if (importedBy.has(f) && importedBy.get(f).length > 0) {
    imported++;
  } else {
    dead++;
    deadList.push(f);
  }
}

console.log("");
console.log("═══════════════════════════════════════════════");
console.log(` Of ${gapsList.length} untouched files:`);
console.log(`   ${imported} imported somewhere (real coverage gap)`);
console.log(`   ${dead} NOT IMPORTED ANYWHERE (dead code)`);
console.log("═══════════════════════════════════════════════");

fs.writeFileSync("/tmp/dead.txt", deadList.join("\n") + "\n");
console.log("\nDead files by module:");
const byMod = {};
for (const f of deadList) {
  const mod = f.split("/")[2] || "(root)";
  byMod[mod] = (byMod[mod] || 0) + 1;
}
for (const [mod, n] of Object.entries(byMod).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(4)}  ${mod}`);
}
