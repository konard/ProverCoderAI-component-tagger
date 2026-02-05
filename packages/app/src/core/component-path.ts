const jsxFilePattern = /\.(tsx|jsx)(\?.*)?$/u

// CHANGE: define canonical attribute name for component path tagging.
// WHY: reduce metadata to a single attribute while keeping full source location.
// QUOTE(TZ): "\u0421\u0430\u043c \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u043c app \u043d\u043e \u0432\u043e\u0442 \u0447\u0442\u043e \u0431\u044b \u0435\u0433\u043e \u043f\u0440\u043e\u0442\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043d\u0430\u0434\u043e \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0435\u0449\u0451 \u043e\u0434\u0438\u043d \u043f\u0440\u043e\u0435\u043a\u0442 \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043d\u0430\u0448 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0430\u043f\u043f \u0431\u0443\u0434\u0435\u0442 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u0442\u044c"
// REF: user-2026-01-14-frontend-consumer
// SOURCE: n/a
// FORMAT THEOREM: forall a in AttributeName: a = "path"
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: attribute name remains stable across transforms
// COMPLEXITY: O(1)/O(1)
export const componentPathAttributeName = "path"

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
// QUOTE(TZ): "\u0421\u0430\u043c \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u043c app \u043d\u043e \u0432\u043e\u0442 \u0447\u0442\u043e \u0431\u044b \u0435\u0433\u043e \u043f\u0440\u043e\u0442\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043d\u0430\u0434\u043e \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0435\u0449\u0451 \u043e\u0434\u0438\u043d \u043f\u0440\u043e\u0435\u043a\u0442 \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043d\u0430\u0448 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0430\u043f\u043f \u0431\u0443\u0434\u0435\u0442 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u0442\u044c"
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
// QUOTE(TZ): "\u0421\u0430\u043c \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u043c app \u043d\u043e \u0432\u043e\u0442 \u0447\u0442\u043e \u0431\u044b \u0435\u0433\u043e \u043f\u0440\u043e\u0442\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043d\u0430\u0434\u043e \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0435\u0449\u0451 \u043e\u0434\u0438\u043d \u043f\u0440\u043e\u0435\u043a\u0442 \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043d\u0430\u0448 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0430\u043f\u043f \u0431\u0443\u0434\u0435\u0442 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u0442\u044c"
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

/**
 * Determines whether a JSX element name represents an HTML tag (lowercase) vs a React Component (PascalCase).
 *
 * @param elementName - The name of the JSX element (e.g., "div", "MyComponent").
 * @returns true if the element is an HTML tag (starts with lowercase), false for React Components (starts with uppercase).
 *
 * @pure true
 * @invariant isHtmlTag(name) = true <-> name[0] in [a-z]
 * @complexity O(1) time / O(1) space
 */
// CHANGE: add pure predicate to distinguish HTML tags from React Components.
// WHY: enable configurable tagging scope (DOM-only vs all JSX).
// QUOTE(TZ): "Определиться: метить только lowercase-теги (div, h1) или вообще всё (MyComponent, Route тоже)."
// REF: issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: ∀ name ∈ JSXElementName: isHtmlTag(name) ↔ name[0] ∈ [a-z]
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: classification is deterministic and based only on first character
// COMPLEXITY: O(1)/O(1)
export const isHtmlTag = (elementName: string): boolean => {
  if (elementName.length === 0) {
    return false
  }
  const firstChar = elementName.codePointAt(0)
  if (firstChar === undefined) {
    return false
  }
  // Check if first character is lowercase ASCII letter (a-z: 97-122)
  return firstChar >= 97 && firstChar <= 122
}
