const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const archivePath = path.join(projectRoot, "src/assets/models/Tower_00001_.7z");
const targetDirs = [
  // The "public/models" copy used to be written to make the file reachable at
  // runtime, but the game loads everything through src/assets already. Keep
  // only the single canonical copy.
  path.join(projectRoot, "src/assets/models/npc/boss"),
];

function resolveSevenZipPath() {
  try {
    const sevenZipBin = require("7zip-bin");
    return sevenZipBin.path7za || sevenZipBin.path7z || sevenZipBin.path || "7z";
  } catch (err) {
    return "7z";
  }
}

function ensureExecutable(binaryPath) {
  if (!path.isAbsolute(binaryPath) || !fs.existsSync(binaryPath)) {
    return;
  }

  try {
    fs.accessSync(binaryPath, fs.constants.X_OK);
  } catch (err) {
    const stat = fs.statSync(binaryPath);
    const mode = stat.mode | 0o111;
    fs.chmodSync(binaryPath, mode);
  }
}

function getArchiveFingerprint(filePath) {
  // Use only the file contents — not mtimeMs, which changes on every git clone.
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function readMarker(markerPath) {
  try {
    const raw = fs.readFileSync(markerPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function fingerprintsMatch(left, right) {
  return typeof left === "string" && left === right;
}

function writeMarker(markerPath, fingerprint) {
  fs.writeFileSync(markerPath, JSON.stringify({ sha256: fingerprint }, null, 2));
}

function runSevenZip(archive, outDir, sevenZipPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      sevenZipPath,
      ["x", "-y", "-aoa", `-o${outDir}`, archive],
      { stdio: "inherit" }
    );

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`7z exited with code ${code}`));
      }
    });
  });
}

async function main() {
  if (!fs.existsSync(archivePath)) {
    // Optional: the game plays without the boss model; log and move on.
    console.warn(
      `Tower archive not found at ${archivePath}. Skipping extraction — the game will use placeholder assets in that scene.`
    );
    return;
  }

  const fingerprint = getArchiveFingerprint(archivePath);
  const sevenZipPath = resolveSevenZipPath();
  ensureExecutable(sevenZipPath);

  for (const targetDir of targetDirs) {
    const markerPath = path.join(targetDir, ".tower_00001_extracted.json");
    const existingMarker = readMarker(markerPath);
    if (existingMarker && fingerprintsMatch(existingMarker.sha256, fingerprint)) {
      continue;
    }

    fs.mkdirSync(targetDir, { recursive: true });
    const displayPath = path.relative(projectRoot, targetDir);
    console.log(`Extracting Tower_00001_.7z to ${displayPath}...`);

    await runSevenZip(archivePath, targetDir, sevenZipPath);
    writeMarker(markerPath, fingerprint);
  }
}

main().catch((err) => {
  console.error("Failed to extract Tower_00001_.7z.");
  console.error(err);
  process.exit(1);
});
