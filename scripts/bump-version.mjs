#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const versionFilePath = path.join(rootDir, "src", "lib", "version.ts");
const pkgPath = path.join(rootDir, "package.json");

const typeArg = (process.argv[2] || "patch").toUpperCase();
const titleArg = process.argv[3] || "Actualización de sistema";
const changesArg = process.argv.slice(4);

if (!["MAJOR", "MINOR", "PATCH"].includes(typeArg)) {
  console.error("Uso: bun run bump [major|minor|patch] <titulo> <cambio 1> <cambio 2> ...");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const currentVersion = pkg.version || "1.0.0";
const parts = currentVersion.split(".").map(Number);
let [major = 1, minor = 0, patch = 0] = parts;

if (typeArg === "MAJOR") {
  major += 1;
  minor = 0;
  patch = 0;
} else if (typeArg === "MINOR") {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const newVersion = `${major}.${minor}.${patch}`;
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`✓ Versión actualizada: ${currentVersion} -> ${newVersion} (${typeArg})`);
