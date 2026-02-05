import type { types as t, Visitor } from "@babel/core"

import { componentPathAttributeName, formatComponentPathValue } from "./component-path.js"

/**
 * Context required for JSX tagging.
 *
 * @pure true
 */
export type JsxTaggerContext = {
  /**
   * Relative file path from the project root.
   */
  readonly relativeFilename: string
}

/**
 * Checks if a JSX attribute with the given name already exists on the element.
 *
 * @param node - JSX opening element to check.
 * @param attrName - Name of the attribute to look for.
 * @returns true if attribute exists, false otherwise.
 *
 * @pure true
 * @invariant returns true iff attribute with exact name exists
 * @complexity O(n) where n = number of attributes
 */
// CHANGE: extract attribute existence check as a pure utility.
// WHY: enable reuse across Vite and Babel plugin implementations.
// REF: issue-12 (unified interface request)
// FORMAT THEOREM: ∀ node, name: attrExists(node, name) ↔ ∃ attr ∈ node.attributes: attr.name = name
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: predicate is deterministic for fixed inputs
// COMPLEXITY: O(n)/O(1)
export const attrExists = (node: t.JSXOpeningElement, attrName: string, types: typeof t): boolean =>
  node.attributes.some(
    (attr) => types.isJSXAttribute(attr) && types.isJSXIdentifier(attr.name, { name: attrName })
  )

/**
 * Creates a JSX attribute with the component path value.
 *
 * @param relativeFilename - Relative path to the file.
 * @param line - 1-based line number.
 * @param column - 0-based column number.
 * @param types - Babel types module.
 * @returns JSX attribute node with the path value.
 *
 * @pure true
 * @invariant attribute name is always componentPathAttributeName
 * @complexity O(1)
 */
// CHANGE: extract attribute creation as a pure factory.
// WHY: single point for attribute creation ensures consistency.
// REF: issue-12 (unified interface request)
// FORMAT THEOREM: ∀ f, l, c: createPathAttribute(f, l, c) = JSXAttribute(path, f:l:c)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: output format is always path:line:column
// COMPLEXITY: O(1)/O(1)
export const createPathAttribute = (
  relativeFilename: string,
  line: number,
  column: number,
  types: typeof t
): t.JSXAttribute => {
  const value = formatComponentPathValue(relativeFilename, line, column)
  return types.jsxAttribute(types.jsxIdentifier(componentPathAttributeName), types.stringLiteral(value))
}

/**
 * Processes a single JSX opening element and adds path attribute if needed.
 *
 * This is the unified business logic for tagging JSX elements with source location.
 * Both the Vite plugin and standalone Babel plugin use this function.
 *
 * @param node - JSX opening element to process.
 * @param context - Tagging context with relative filename.
 * @param types - Babel types module.
 * @returns true if attribute was added, false if skipped.
 *
 * @pure false (mutates node)
 * @invariant each JSX element has at most one path attribute after processing
 * @complexity O(n) where n = number of existing attributes
 */
// CHANGE: extract unified JSX element processing logic.
// WHY: satisfy user request for single business logic shared by Vite and Babel.
// QUOTE(TZ): "А ты можешь сделать что бы бизнес логика оставалось одной? Ну типо переиспользуй код с vite версии на babel"
// REF: issue-12-comment (unified interface request)
// FORMAT THEOREM: ∀ jsx ∈ JSXOpeningElement: processElement(jsx) → tagged(jsx) ∨ skipped(jsx)
// PURITY: SHELL (mutates AST)
// EFFECT: AST mutation
// INVARIANT: idempotent - processing same element twice produces same result
// COMPLEXITY: O(n)/O(1)
export const processJsxElement = (
  node: t.JSXOpeningElement,
  context: JsxTaggerContext,
  types: typeof t
): boolean => {
  // Skip if no location info
  if (node.loc === null || node.loc === undefined) {
    return false
  }

  // Skip if already has path attribute (idempotency)
  if (attrExists(node, componentPathAttributeName, types)) {
    return false
  }

  const { column, line } = node.loc.start
  const attr = createPathAttribute(context.relativeFilename, line, column, types)

  node.attributes.push(attr)
  return true
}

/**
 * Creates a Babel visitor for JSX elements that uses the unified tagging logic.
 *
 * This is the shared visitor factory used by both:
 * - Vite plugin (componentTagger) - passes relative filename directly
 * - Standalone Babel plugin - computes relative filename from state
 *
 * @param getContext - Function to extract context from Babel state.
 * @param types - Babel types module.
 * @returns Babel visitor object for JSXOpeningElement.
 *
 * @pure true (returns immutable visitor object)
 * @invariant visitor applies processJsxElement to all JSX opening elements
 * @complexity O(1) for visitor creation
 */
// CHANGE: create shared visitor factory for both plugin types.
// WHY: single unified interface as requested by user.
// QUOTE(TZ): "Сделай единный интерфейс для этого"
// REF: issue-12-comment (unified interface request)
// FORMAT THEOREM: ∀ visitor = createVisitor(ctx): visitor processes all JSX elements uniformly
// PURITY: CORE
// EFFECT: n/a (visitor application has effects)
// INVARIANT: visitor behavior is consistent across plugin implementations
// COMPLEXITY: O(1)/O(1)
export const createJsxTaggerVisitor = <TState>(
  getContext: (state: TState) => JsxTaggerContext | null,
  types: typeof t
): Visitor<TState> => ({
  JSXOpeningElement(nodePath, state) {
    const context = getContext(state)
    if (context === null) {
      return
    }
    processJsxElement(nodePath.node, context, types)
  }
})
