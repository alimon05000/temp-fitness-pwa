import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
const patterns = [
  /(?:sk-[A-Za-z0-9_-]{24,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g,
  /(?:TOOKEN_API_KEY|SUPABASE_SERVICE_ROLE_KEY|UPSTASH_REDIS_REST_TOKEN)\s*[:=]\s*["'](?!\s*["']|PASTE_|YOUR_|\$|process\.)([^"'\s]{12,})["']/g,
];
const ignored = new Set([
  "node_modules",
  ".git",
  ".vercel",
  "test-results",
  "playwright-report",
]);
async function files(dir) {
  const list = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      list
        .filter((e) => !ignored.has(e.name))
        .map((e) =>
          e.isDirectory()
            ? files(path.join(dir, e.name))
            : path.join(dir, e.name),
        ),
    )
  ).flat();
}
let failed = false;
function scan(text, name) {
  for (const re of patterns) {
    re.lastIndex = 0;
    if (re.test(text)) {
      console.error(`Possible secret in ${name} (value redacted)`);
      failed = true;
    }
  }
}
for (const f of await files("."))
  if (
    /\.(?:ts|tsx|js|mjs|json|md|yml|yaml|html|css|example)$/.test(f) &&
    !f.includes("scan-secrets.mjs")
  )
    scan(await readFile(f, "utf8"), f);
try {
  const history = execFileSync("git", ["log", "-p", "--all", "--format="], {
    encoding: "utf8",
    maxBuffer: 50e6,
    stdio: ["ignore", "pipe", "pipe"],
  });
  scan(history, "git history");
} catch {
  console.log("No commit history to scan yet.");
}
if (failed) process.exitCode = 1;
else
  console.log(
    "No known secret patterns in tracked source, build or commit history. This scan does not prove absence of all secrets.",
  );
