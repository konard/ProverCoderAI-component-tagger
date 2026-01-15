import { type PluginObj, transformAsync, types as t } from "@babel/core"
import { layer as NodePathLayer } from "@effect/platform-node/NodePath"
import { Path } from "@effect/platform/Path"
import { Effect, pipe } from "effect"
import type { PluginOption } from "vite"

import { componentPathAttributeName, formatComponentPathValue, isJsxFile } from "../core/component-path.js"

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

// CHANGE: compute relative paths from the resolved Vite root instead of process.cwd().
// WHY: keep component paths stable across monorepos and custom Vite roots.
// QUOTE(TZ): "Сам компонент должен быть в текущем app но вот что бы его протестировать надо создать ещё один проект который наш текущий апп будет подключать"
// REF: user-2026-01-14-frontend-consumer
// SOURCE: n/a
// FORMAT THEOREM: forall p in Path: relative(root, p) = r -> resolve(root, r) = p
// PURITY: SHELL
// EFFECT: Effect<string, never, Path>
// INVARIANT: output is deterministic for a fixed root
// COMPLEXITY: O(n)/O(1)
const relativeFromRoot = (rootDir: string, absolutePath: string): Effect.Effect<string, never, Path> =>
  pipe(
    Path,
    Effect.map((pathService) => pathService.relative(rootDir, absolutePath))
  )

const attrExists = (node: t.JSXOpeningElement, attrName: string): boolean =>
  node.attributes.some(
    (attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: attrName })
  )

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

// CHANGE: inject a single path attribute into JSX opening elements.
// WHY: remove redundant metadata while preserving the full source location payload.
// QUOTE(TZ): "\u0421\u0430\u043c \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u043c app \u043d\u043e \u0432\u043e\u0442 \u0447\u0442\u043e \u0431\u044b \u0435\u0433\u043e \u043f\u0440\u043e\u0442\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043d\u0430\u0434\u043e \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0435\u0449\u0451 \u043e\u0434\u0438\u043d \u043f\u0440\u043e\u0435\u043a\u0442 \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043d\u0430\u0448 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0430\u043f\u043f \u0431\u0443\u0434\u0435\u0442 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u0442\u044c"
// REF: user-2026-01-14-frontend-consumer
// SOURCE: n/a
// FORMAT THEOREM: forall f in JSXOpeningElement: rendered(f) -> annotated(f)
// PURITY: SHELL
// EFFECT: Effect<ViteTransformResult | null, ComponentTaggerError, Path>
// INVARIANT: each JSX opening element has at most one path attribute
// COMPLEXITY: O(n)/O(1), n = number of JSX elements
const makeBabelTagger = (relativeFilename: string): PluginObj => ({
  name: "component-path-babel-tagger",
  visitor: {
    JSXOpeningElement(openPath: { readonly node: t.JSXOpeningElement }) {
      const { node } = openPath

      if (node.loc === null || node.loc === undefined) {
        return
      }

      if (attrExists(node, componentPathAttributeName)) {
        return
      }

      const { column, line } = node.loc.start
      const value = formatComponentPathValue(relativeFilename, line, column)

      node.attributes.push(
        t.jsxAttribute(t.jsxIdentifier(componentPathAttributeName), t.stringLiteral(value))
      )
    }
  }
})

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
// QUOTE(TZ): "\u0421\u0430\u043c \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u043c app \u043d\u043e \u0432\u043e\u0442 \u0447\u0442\u043e \u0431\u044b \u0435\u0433\u043e \u043f\u0440\u043e\u0442\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043d\u0430\u0434\u043e \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0435\u0449\u0451 \u043e\u0434\u0438\u043d \u043f\u0440\u043e\u0435\u043a\u0442 \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043d\u0430\u0448 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0430\u043f\u043f \u0431\u0443\u0434\u0435\u0442 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u0442\u044c"
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
  rootDir: string
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
            plugins: [makeBabelTagger(relative)],
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
 * @returns Vite PluginOption for pre-transform tagging.
 *
 * @pure false
 * @effect Babel transform through Effect
 * @invariant only JSX/TSX modules are transformed
 * @complexity O(n) time / O(1) space per JSX module
 * @throws Never - errors are typed and surfaced by Effect
 */
// CHANGE: expose a Vite plugin that tags JSX with only path.
// WHY: reduce attribute noise while keeping full path metadata.
// QUOTE(TZ): "\u0421\u0430\u043c \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u043c app \u043d\u043e \u0432\u043e\u0442 \u0447\u0442\u043e \u0431\u044b \u0435\u0433\u043e \u043f\u0440\u043e\u0442\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043d\u0430\u0434\u043e \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0435\u0449\u0451 \u043e\u0434\u0438\u043d \u043f\u0440\u043e\u0435\u043a\u0442 \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043d\u0430\u0448 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0430\u043f\u043f \u0431\u0443\u0434\u0435\u0442 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u0442\u044c"
// REF: user-2026-01-14-frontend-consumer
// SOURCE: n/a
// FORMAT THEOREM: forall id: isJsxFile(id) -> transform(id) adds component-path
// PURITY: SHELL
// EFFECT: Effect<ViteTransformResult | null, ComponentTaggerError, never>
// INVARIANT: no duplicate path attributes
// COMPLEXITY: O(n)/O(1)
export const componentTagger = (): PluginOption => {
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

      return Effect.runPromise(pipe(runTransform(code, id, resolvedRoot), Effect.provide(NodePathLayer)))
    }
  }
}
