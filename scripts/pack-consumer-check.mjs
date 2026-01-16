// CHANGE: verify the packed package against a clean consumer project.
// WHY: ensure published artifacts resolve in an external pnpm module.
// QUOTE(ТЗ): n/a
// REF: user-2026-01-16-pack-consumer
// SOURCE: n/a
// FORMAT THEOREM: ∀ build: pack(build) → typecheck(consumer)
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: consumer typecheck passes against packed tarball
// COMPLEXITY: O(1)/O(1)
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const consumerRoot = path.resolve(repoRoot, "packages/pack-consumer")
const packDir = path.join(consumerRoot, ".pack")
const tarballPath = path.join(packDir, "component-tagger.tgz")

fs.mkdirSync(packDir, { recursive: true })

execFileSync(
  "pnpm",
  ["--filter", "@prover-coder-ai/component-tagger", "pack", "--out", tarballPath],
  { cwd: repoRoot, stdio: "inherit" }
)

execFileSync("pnpm", ["install", "--ignore-workspace"], { cwd: consumerRoot, stdio: "inherit" })

{
  const installedRoot = path.join(consumerRoot, "node_modules/@prover-coder-ai/component-tagger")
  const distEntry = path.join(installedRoot, "dist/index.js")
  const srcRoot = path.join(installedRoot, "src")

  if (!fs.existsSync(distEntry)) {
    throw new Error(`Packed dist entry not found at ${distEntry}`)
  }
  if (fs.existsSync(srcRoot)) {
    throw new Error("Expected packed install without src/, but src/ exists")
  }
}

execFileSync("pnpm", ["exec", "tsc", "--noEmit"], { cwd: consumerRoot, stdio: "inherit" })

execFileSync(
  "node",
  ["--input-type=module", "-e", "import { componentTagger } from '@prover-coder-ai/component-tagger'; console.log(typeof componentTagger)"],
  { cwd: consumerRoot, stdio: "inherit" }
)
