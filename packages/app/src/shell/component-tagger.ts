import { type PluginObj, transformAsync, types as t } from "@babel/core"
import type { Path } from "@effect/platform/Path"
import { Effect, pipe } from "effect"
import type { PluginOption } from "vite"

import { isJsxFile } from "../core/component-path.js"
import { createJsxTaggerVisitor, type JsxTaggerContext, type JsxTaggerOptions } from "../core/jsx-tagger.js"
import { NodePathLayer, relativeFromRoot } from "../core/path-service.js"

type BabelTransformResult = Awaited<ReturnType<typeof transformAsync>>

type ViteTransformResult = {
  readonly code: string
  readonly map: NonNullable<BabelTransformResult>["map"] | null
}

class ComponentTaggerError extends Error {
  readonly _tag = "ComponentTaggerError"

  constructor(message: string, override readonly cause: Error) {
    super(message)
  }
}

const stripQuery = (id: string): string => {
  const queryIndex = id.indexOf("?")
  return queryIndex === -1 ? id : id.slice(0, queryIndex)
}

const toViteResult = (result: BabelTransformResult): ViteTransformResult | null => {
  if (result === null || result.code === null || result.code === undefined) {
    return null
  }

  const { code } = result

  return {
    code,
    map: result.map ?? null
  }
}

// CHANGE: use unified JSX tagger visitor from core module with options support.
// WHY: share business logic between Vite and Babel plugins as requested and propagate configuration.
// QUOTE(TZ): "А ты можешь сделать что бы бизнес логика оставалось одной? Ну типо переиспользуй код с vite версии на babel"
// QUOTE(TZ): "Если нужно гибко — добавить опцию tagComponents?: boolean"
// REF: issue-12-comment (unified interface request), issue-23 (configurable scope)
// SOURCE: n/a
// FORMAT THEOREM: forall f in JSXOpeningElement: rendered(f) -> (shouldTag(f, opts) ∧ annotated(f)) ∨ skipped(f)
// PURITY: SHELL
// EFFECT: Babel AST transformation
// INVARIANT: each JSX opening element has at most one path attribute
// COMPLEXITY: O(n)/O(1), n = number of JSX elements
type ViteBabelState = {
  readonly context: JsxTaggerContext
}

const makeBabelTagger = (relativeFilename: string, options?: JsxTaggerOptions): PluginObj<ViteBabelState> => {
  const context: JsxTaggerContext = { relativeFilename, options }

  return {
    name: "component-path-babel-tagger",
    visitor: createJsxTaggerVisitor<ViteBabelState>(
      () => context,
      t
    )
  }
}

/**
 * Builds a Vite transform result with a single component-path attribute per JSX element.
 *
 * @param code - Source code to transform.
 * @param id - Vite module id for the source code.
 * @returns Vite-compatible transform result or null when no output is produced.
 *
 * @pure false
 * @effect Babel transform
 * @invariant each JSX opening element is tagged once per transform
 * @complexity O(n) time / O(1) space where n = JSX element count
 */
// CHANGE: wrap Babel transform in Effect for typed errors and controlled effects.
// WHY: satisfy the shell-only effect boundary while avoiding async/await.
// QUOTE(TZ): "Сам компонент должен быть в текущем app но вот что бы его протестировать надо создать ещё один проект который наш текущий апп будет подключать"
// REF: user-2026-01-14-frontend-consumer
// SOURCE: n/a
// FORMAT THEOREM: forall c in Code: transform(c) = r -> r is tagged or null
// PURITY: SHELL
// EFFECT: Effect<ViteTransformResult | null, ComponentTaggerError, never>
// INVARIANT: errors are surfaced as ComponentTaggerError only
// COMPLEXITY: O(n)/O(1)
const runTransform = (
  code: string,
  id: string,
  rootDir: string,
  options?: JsxTaggerOptions
): Effect.Effect<ViteTransformResult | null, ComponentTaggerError, Path> => {
  const cleanId = stripQuery(id)

  return pipe(
    relativeFromRoot(rootDir, cleanId),
    Effect.flatMap((relative) =>
      Effect.tryPromise({
        try: () =>
          transformAsync(code, {
            filename: cleanId,
            babelrc: false,
            configFile: false,
            parserOpts: {
              sourceType: "module",
              plugins: ["typescript", "jsx", "decorators-legacy"]
            },
            plugins: [makeBabelTagger(relative, options)],
            sourceMaps: true
          }),
        catch: (cause) => {
          const error = cause instanceof Error ? cause : new Error(String(cause))
          return new ComponentTaggerError("Babel transform failed", error)
        }
      })
    ),
    Effect.map((result) => toViteResult(result))
  )
}

/**
 * Creates a Vite plugin that injects a single component-path data attribute.
 *
 * @param options - Optional configuration for tagging behavior.
 * @returns Vite PluginOption for pre-transform tagging.
 *
 * @pure false
 * @effect Babel transform through Effect
 * @invariant only JSX/TSX modules are transformed
 * @invariant HTML tags are always tagged
 * @invariant React Components are tagged based on options.tagComponents
 * @complexity O(n) time / O(1) space per JSX module
 * @throws Never - errors are typed and surfaced by Effect
 */
// CHANGE: expose a Vite plugin with configurable tagging scope.
// WHY: enable users to control whether React Components are tagged in addition to HTML tags.
// QUOTE(TZ): "Сам компонент должен быть в текущем app но вот что бы его протестировать надо создать ещё один проект который наш текущий апп будет подключать"
// QUOTE(TZ): "Если нужно гибко — добавить опцию tagComponents?: boolean (default на твоё усмотрение)."
// REF: user-2026-01-14-frontend-consumer, issue-23 (configurable scope)
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: forall id: isJsxFile(id) -> transform(id, opts) adds component-path per shouldTag predicate
// PURITY: SHELL
// EFFECT: Effect<ViteTransformResult | null, ComponentTaggerError, never>
// INVARIANT: no duplicate path attributes
// COMPLEXITY: O(n)/O(1)
export const componentTagger = (options?: JsxTaggerOptions): PluginOption => {
  let resolvedRoot = process.cwd()

  return {
    name: "component-path-tagger",
    enforce: "pre",
    apply: "serve",
    configResolved(config) {
      resolvedRoot = config.root
    },
    transform(code, id) {
      if (!isJsxFile(id)) {
        return null
      }

      return Effect.runPromise(pipe(runTransform(code, id, resolvedRoot, options), Effect.provide(NodePathLayer)))
    }
  }
}
