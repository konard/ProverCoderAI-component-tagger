const jsxFilePattern = /\.(tsx|jsx)(\?.*)?$/u

// CHANGE: define canonical Babel plugin name for component path tagging.
// WHY: eliminate magic string duplication across plugin implementations.
// QUOTE(ТЗ): "Вынести строки имён плагинов в константы (чтобы не дублировать \"component-path-babel-tagger\")."
// REF: issue-19
// SOURCE: n/a
// FORMAT THEOREM: forall p in PluginName: p = "component-path-babel-tagger"
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: plugin name remains stable across all implementations
// COMPLEXITY: O(1)/O(1)
export const babelPluginName = "component-path-babel-tagger"

/**
 * Normalizes a module ID by stripping query parameters.
 *
 * Vite and other bundlers may append query parameters to module IDs
 * (e.g., "src/App.tsx?import" or "src/App.tsx?v=123"). This function
 * returns the clean file path without query string.
 *
 * @param id - Module ID (may include query parameters).
 * @returns Clean path without query string.
 *
 * @pure true
 * @invariant ∀ id: normalizeModuleId(id) does not contain '?'
 * @complexity O(n) time / O(1) space where n = |id|
 */
// CHANGE: centralize query stripping as a pure function in core.
// WHY: unify module ID normalization in one place as requested in issue #18.
// QUOTE(ТЗ): "Вынести stripQuery() (или normalizeModuleId()) в core, использовать в Vite и (при желании) в isJsxFile."
// REF: REQ-18 (issue #18)
// SOURCE: n/a
// FORMAT THEOREM: ∀ id: normalizeModuleId(id) = id.split('?')[0]
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: result contains no query string
// COMPLEXITY: O(n)/O(1)
export const normalizeModuleId = (id: string): string => {
  const queryIndex = id.indexOf("?")
  return queryIndex === -1 ? id : id.slice(0, queryIndex)
}

// CHANGE: rename attribute from "path" to "data-path" for HTML5 compliance.
// WHY: data-* attributes are standard HTML5 custom data attributes, improving compatibility.
// QUOTE(issue-14): "Rename attribute path → data-path (breaking change)"
// REF: issue-14
// SOURCE: https://html.spec.whatwg.org/multipage/dom.html#custom-data-attribute
// FORMAT THEOREM: forall a in AttributeName: a = "data-path"
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: attribute name remains stable across transforms
// COMPLEXITY: O(1)/O(1)
export const componentPathAttributeName = "data-path"

/**
 * Checks whether the Vite id represents a JSX or TSX module.
 *
 * @param id - Vite module id (may include query parameters).
 * @returns true when the id ends with .jsx/.tsx (optionally with query).
 *
 * @pure true
 * @invariant isJsxFile(id) = true -> id matches /\.(tsx|jsx)(\?.*)?$/u
 * @complexity O(n) time / O(1) space where n = |id|
 */
// CHANGE: centralize JSX file detection as a pure predicate.
// WHY: keep file filtering in the functional core for testability.
// QUOTE(TZ): "Сам компонент должен быть в текущем app но вот что бы его протестировать надо создать ещё один проект который наш текущий апп будет подключать"
// REF: user-2026-01-14-frontend-consumer
// SOURCE: n/a
// FORMAT THEOREM: forall id in ModuleId: isJsxFile(id) -> matches(id, jsxFilePattern)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: predicate depends only on id content
// COMPLEXITY: O(n)/O(1)
export const isJsxFile = (id: string): boolean => jsxFilePattern.test(id)

/**
 * Formats the component path payload containing file, line, and column.
 *
 * @param relativeFilename - Path relative to the project root.
 * @param line - 1-based line number from the parser location.
 * @param column - 0-based column number from the parser location.
 * @returns Encoded location string: "<path>:<line>:<column>".
 *
 * @pure true
 * @invariant line >= 1 and column >= 0
 * @complexity O(1) time / O(1) space
 */
// CHANGE: provide a pure formatter for component location payloads.
// WHY: reuse a single, deterministic encoding for UI metadata.
// QUOTE(TZ): "Сам компонент должен быть в текущем app но вот что бы его протестировать надо создать ещё один проект который наш текущий апп будет подключать"
// REF: user-2026-01-14-frontend-consumer
// SOURCE: n/a
// FORMAT THEOREM: forall p,l,c: formatComponentPathValue(p,l,c) = concat(p, ":", l, ":", c)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: output encodes path + line + column without loss
// COMPLEXITY: O(1)/O(1)
export const formatComponentPathValue = (
  relativeFilename: string,
  line: number,
  column: number
): string => `${relativeFilename}:${line}:${column}`
