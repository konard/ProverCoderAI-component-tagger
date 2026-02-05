/**
 * Path service utilities using Effect-TS.
 *
 * PURITY: SHELL (uses Effect for file system operations)
 * PURPOSE: Centralize Effect-based path operations to avoid code duplication.
 */

import { layer as NodePathLayer } from "@effect/platform-node/NodePath"
import { Path } from "@effect/platform/Path"
import { Effect, pipe } from "effect"

/**
 * Computes relative path using Effect's Path service.
 *
 * @param rootDir - Root directory for relative path calculation.
 * @param absolutePath - Absolute file path to convert.
 * @returns Effect that produces relative path string.
 *
 * @pure false
 * @effect Path service access
 * @invariant result is a valid relative path
 * @complexity O(n)/O(1) where n = path length
 */
// CHANGE: extract common path calculation logic from both plugins.
// WHY: eliminate code duplication detected by vibecode-linter.
// REF: lint error DUPLICATE #1
// FORMAT THEOREM: ∀ (root, path): relativePath(root, path) = Path.relative(root, path)
// PURITY: SHELL
// EFFECT: Effect<string, never, Path>
// INVARIANT: always returns a valid relative path for valid inputs
// COMPLEXITY: O(n)/O(1)
export const relativeFromRoot = (
  rootDir: string,
  absolutePath: string
): Effect.Effect<string, never, Path> =>
  pipe(
    Path,
    Effect.map((pathService) => pathService.relative(rootDir, absolutePath))
  )

/**
 * Synchronously computes relative path using Effect's Path service.
 *
 * @param rootDir - Root directory for relative path calculation.
 * @param absolutePath - Absolute file path to convert.
 * @returns Relative path string.
 *
 * @pure false
 * @effect Path service access (synchronous)
 * @invariant result is a valid relative path
 * @complexity O(n)/O(1) where n = path length
 */
// CHANGE: provide synchronous variant for Babel plugin (which requires sync operations).
// WHY: Babel plugins must operate synchronously; Effect.runSync bridges Effect-style code.
// REF: babel-plugin.ts:65-71
// FORMAT THEOREM: ∀ (root, path): computeRelativePath(root, path) = runSync(relativePath(root, path))
// PURITY: SHELL
// EFFECT: Path service (executed synchronously)
// INVARIANT: always returns a valid string for valid inputs
// COMPLEXITY: O(n)/O(1)
export const computeRelativePath = (rootDir: string, absolutePath: string): string =>
  pipe(relativeFromRoot(rootDir, absolutePath), Effect.provide(NodePathLayer), Effect.runSync)

/**
 * Re-export NodePathLayer for plugins that need to provide it explicitly.
 */

export { layer as NodePathLayer } from "@effect/platform-node/NodePath"
