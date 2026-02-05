import { type PluginObj, transformAsync, types as t } from "@babel/core"
import type { Path } from "@effect/platform/Path"
import { Effect, pipe } from "effect"
import type { PluginOption } from "vite"

import { babelPluginName, componentPathAttributeName, isJsxFile, normalizeModuleId } from "../core/component-path.js"
import { createJsxTaggerVisitor, type JsxTaggerContext, type JsxTaggerOptions } from "../core/jsx-tagger.js"
import { NodePathLayer, relativeFromRoot } from "../core/path-service.js"

/**
 * Options for the component tagger Vite plugin.
 */
// CHANGE: extend Vite plugin options with both attributeName and tagComponents configuration.
// WHY: enable users to control attribute name and whether React Components are tagged.
// QUOTE(TZ): "Если нужно гибко — добавить опцию tagComponents?: boolean (default на твоё усмотрение)."
// QUOTE(issue-14): "Add option attributeName (default: data-path) for both plugins"
// REF: issue-14, issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: ∀ opts ∈ ComponentTaggerOptions: opts extends JsxTaggerOptions
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: options are immutable and propagated to core logic
// COMPLEXITY: O(1)/O(1)
export type ComponentTaggerOptions = JsxTaggerOptions & {
  /**
   * Name of the attribute to add to JSX elements.
   * Defaults to "data-path".
   */
  readonly attributeName?: string
}

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

// CHANGE: use unified JSX tagger visitor from core module with both attributeName and options support.
// WHY: share business logic between Vite and Babel plugins as requested and propagate configuration.
// QUOTE(TZ): "А ты можешь сделать что бы бизнес логика оставалось одной? Ну типо переиспользуй код с vite версии на babel"
// QUOTE(TZ): "Если нужно гибко — добавить опцию tagComponents?: boolean"
// REF: issue-12-comment (unified interface request), issue-14 (attributeName option), issue-23 (configurable scope)
// SOURCE: n/a
// FORMAT THEOREM: forall f in JSXOpeningElement: rendered(f) -> (shouldTag(f, opts) ∧ annotated(f)) ∨ skipped(f)
// PURITY: SHELL
// EFFECT: Babel AST transformation
// INVARIANT: each JSX opening element has at most one path attribute
// COMPLEXITY: O(n)/O(1), n = number of JSX elements
const makeBabelTagger = (
  relativeFilename: string,
  attributeName: string,
  options?: JsxTaggerOptions
): PluginObj => {
  const context: JsxTaggerContext = { relativeFilename, attributeName, options }

  return {
    name: babelPluginName,
    visitor: createJsxTaggerVisitor(
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
  attributeName: string,
  options?: JsxTaggerOptions
): Effect.Effect<ViteTransformResult | null, ComponentTaggerError, Path> => {
  const cleanId = normalizeModuleId(id)

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
            plugins: [makeBabelTagger(relative, attributeName, options)],
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
 * @param options - Configuration options for the plugin (attributeName and tagComponents).
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
// CHANGE: expose a Vite plugin with configurable tagging scope and attribute name.
// WHY: enable users to control attribute name and whether React Components are tagged in addition to HTML tags.
// QUOTE(TZ): "Сам компонент должен быть в текущем app но вот что бы его протестировать надо создать ещё один проект который наш текущий апп будет подключать"
// QUOTE(TZ): "Если нужно гибко — добавить опцию tagComponents?: boolean (default на твоё усмотрение)."
// QUOTE(issue-14): "Add option attributeName (default: data-path) for both plugins"
// REF: user-2026-01-14-frontend-consumer, issue-14 (attributeName option), issue-23 (configurable scope)
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: forall id: isJsxFile(id) -> transform(id, opts) adds component-path per shouldTag predicate
// PURITY: SHELL
// EFFECT: Effect<ViteTransformResult | null, ComponentTaggerError, never>
// INVARIANT: no duplicate attributes with the same name
// COMPLEXITY: O(n)/O(1)
export const componentTagger = (options?: ComponentTaggerOptions): PluginOption => {
  const attributeName = options?.attributeName ?? componentPathAttributeName
  const jsxOptions: JsxTaggerOptions | undefined = options
    ? { tagComponents: options.tagComponents }
    : undefined
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

      return Effect.runPromise(
        pipe(runTransform(code, id, resolvedRoot, attributeName, jsxOptions), Effect.provide(NodePathLayer))
      )
    }
  }
}
