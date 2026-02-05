import { types as t } from "@babel/core"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

import { type JsxTaggerContext, processJsxElement, shouldTagElement } from "../../src/core/jsx-tagger.js"

/**
 * Unit tests for JSX tagging logic with configurable scope.
 *
 * CHANGE: add comprehensive tests for tagComponents configuration.
 * WHY: ensure correct behavior for DOM-only vs all JSX tagging modes.
 * QUOTE(TZ): "Есть тесты на <div /> и <MyComponent /> под разными настройками."
 * REF: issue-23
 * SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
 * FORMAT THEOREM: ∀ elem, opts: shouldTagElement(elem, opts) satisfies configurable tagging invariants
 * PURITY: CORE (tests pure functions)
 * EFFECT: n/a
 * INVARIANT: tests verify mathematical properties of tagging predicates
 * COMPLEXITY: O(1) per test
 */

// Helper to create JSX identifier nodes
const createJsxElement = (name: string): t.JSXOpeningElement => {
  return t.jsxOpeningElement(t.jsxIdentifier(name), [], false)
}

// Helper to create JSX element with location info for testing
const createJsxElementWithLocation = (name: string, line: number, column: number): t.JSXOpeningElement => {
  const element = t.jsxOpeningElement(t.jsxIdentifier(name), [], false)
  element.loc = {
    start: { line, column, index: 0 },
    end: { line, column: column + name.length, index: 0 },
    filename: "test.tsx",
    identifierName: name
  }
  return element
}

describe("jsx-tagger", () => {
  describe("shouldTagElement", () => {
    describe("HTML tags (lowercase)", () => {
      it.effect("always tags HTML elements regardless of options", () =>
        Effect.sync(() => {
          const divElement = createJsxElement("div")
          const h1Element = createJsxElement("h1")

          // With tagComponents: true
          expect(shouldTagElement(divElement, { tagComponents: true }, t)).toBe(true)
          expect(shouldTagElement(h1Element, { tagComponents: true }, t)).toBe(true)

          // With tagComponents: false
          expect(shouldTagElement(divElement, { tagComponents: false }, t)).toBe(true)
          expect(shouldTagElement(h1Element, { tagComponents: false }, t)).toBe(true)

          // With undefined options (default behavior)
          expect(shouldTagElement(divElement, undefined, t)).toBe(true)
          expect(shouldTagElement(h1Element, undefined, t)).toBe(true)

          // With empty options object
          expect(shouldTagElement(divElement, {}, t)).toBe(true)
          expect(shouldTagElement(h1Element, {}, t)).toBe(true)
        }))
    })

    describe("React Components (PascalCase)", () => {
      it.effect("tags Components when tagComponents is true", () =>
        Effect.sync(() => {
          const myComponent = createJsxElement("MyComponent")
          const route = createJsxElement("Route")

          expect(shouldTagElement(myComponent, { tagComponents: true }, t)).toBe(true)
          expect(shouldTagElement(route, { tagComponents: true }, t)).toBe(true)
        }))

      it.effect("skips Components when tagComponents is false", () =>
        Effect.sync(() => {
          const myComponent = createJsxElement("MyComponent")
          const route = createJsxElement("Route")

          expect(shouldTagElement(myComponent, { tagComponents: false }, t)).toBe(false)
          expect(shouldTagElement(route, { tagComponents: false }, t)).toBe(false)
        }))

      it.effect("tags Components by default (undefined options)", () =>
        Effect.sync(() => {
          const myComponent = createJsxElement("MyComponent")
          const route = createJsxElement("Route")

          // Default behavior: tag everything
          expect(shouldTagElement(myComponent, undefined, t)).toBe(true)
          expect(shouldTagElement(route, undefined, t)).toBe(true)
        }))

      it.effect("tags Components by default (empty options object)", () =>
        Effect.sync(() => {
          const myComponent = createJsxElement("MyComponent")
          const route = createJsxElement("Route")

          expect(shouldTagElement(myComponent, {}, t)).toBe(true)
          expect(shouldTagElement(route, {}, t)).toBe(true)
        }))
    })

    describe("JSXMemberExpression (e.g., Foo.Bar)", () => {
      it.effect("skips JSXMemberExpression elements", () =>
        Effect.sync(() => {
          const memberExpr = t.jsxOpeningElement(
            t.jsxMemberExpression(t.jsxIdentifier("Foo"), t.jsxIdentifier("Bar")),
            [],
            false
          )

          expect(shouldTagElement(memberExpr, { tagComponents: true }, t)).toBe(false)
          expect(shouldTagElement(memberExpr, { tagComponents: false }, t)).toBe(false)
        }))
    })

    describe("JSXNamespacedName (e.g., svg:path)", () => {
      it.effect("tags namespaced elements based on namespace name", () =>
        Effect.sync(() => {
          // svg:path - namespace is lowercase "svg"
          const namespacedElement = t.jsxOpeningElement(
            t.jsxNamespacedName(t.jsxIdentifier("svg"), t.jsxIdentifier("path")),
            [],
            false
          )

          expect(shouldTagElement(namespacedElement, { tagComponents: true }, t)).toBe(true)
          expect(shouldTagElement(namespacedElement, { tagComponents: false }, t)).toBe(true)
        }))

      it.effect("skips namespaced elements with uppercase namespace", () =>
        Effect.sync(() => {
          // Custom:Element - namespace is uppercase "Custom"
          const namespacedElement = t.jsxOpeningElement(
            t.jsxNamespacedName(t.jsxIdentifier("Custom"), t.jsxIdentifier("Element")),
            [],
            false
          )

          expect(shouldTagElement(namespacedElement, { tagComponents: true }, t)).toBe(true)
          expect(shouldTagElement(namespacedElement, { tagComponents: false }, t)).toBe(false)
        }))
    })
  })

  describe("processJsxElement", () => {
    it.effect("tags HTML elements with default options", () =>
      Effect.sync(() => {
        const divElement = createJsxElementWithLocation("div", 1, 0)
        const context: JsxTaggerContext = { relativeFilename: "src/App.tsx" }

        const result = processJsxElement(divElement, context, t)

        expect(result).toBe(true)
        expect(divElement.attributes).toHaveLength(1)
        expect(t.isJSXAttribute(divElement.attributes[0])).toBe(true)
        const attr = divElement.attributes[0] as t.JSXAttribute
        expect(t.isJSXIdentifier(attr.name)).toBe(true)
        if (t.isJSXIdentifier(attr.name)) {
          expect(attr.name.name).toBe("path")
        }
        expect(t.isStringLiteral(attr.value)).toBe(true)
        if (t.isStringLiteral(attr.value)) {
          expect(attr.value.value).toBe("src/App.tsx:1:0")
        }
      }))

    it.effect("tags React Components with tagComponents: true", () =>
      Effect.sync(() => {
        const myComponent = createJsxElementWithLocation("MyComponent", 5, 2)
        const context: JsxTaggerContext = {
          relativeFilename: "src/App.tsx",
          options: { tagComponents: true }
        }

        const result = processJsxElement(myComponent, context, t)

        expect(result).toBe(true)
        expect(myComponent.attributes).toHaveLength(1)
      }))

    it.effect("skips React Components with tagComponents: false", () =>
      Effect.sync(() => {
        const myComponent = createJsxElementWithLocation("MyComponent", 5, 2)
        const context: JsxTaggerContext = {
          relativeFilename: "src/App.tsx",
          options: { tagComponents: false }
        }

        const result = processJsxElement(myComponent, context, t)

        expect(result).toBe(false)
        expect(myComponent.attributes).toHaveLength(0)
      }))

    it.effect("tags React Components by default (no options)", () =>
      Effect.sync(() => {
        const myComponent = createJsxElementWithLocation("Route", 10, 4)
        const context: JsxTaggerContext = { relativeFilename: "src/Routes.tsx" }

        const result = processJsxElement(myComponent, context, t)

        expect(result).toBe(true)
        expect(myComponent.attributes).toHaveLength(1)
      }))

    it.effect("is idempotent - does not add duplicate path attributes", () =>
      Effect.sync(() => {
        const divElement = createJsxElementWithLocation("div", 1, 0)
        const context: JsxTaggerContext = { relativeFilename: "src/App.tsx" }

        // First call should add attribute
        const result1 = processJsxElement(divElement, context, t)
        expect(result1).toBe(true)
        expect(divElement.attributes).toHaveLength(1)

        // Second call should skip (idempotency)
        const result2 = processJsxElement(divElement, context, t)
        expect(result2).toBe(false)
        expect(divElement.attributes).toHaveLength(1)
      }))

    it.effect("skips elements without location info", () =>
      Effect.sync(() => {
        const divElement = t.jsxOpeningElement(t.jsxIdentifier("div"), [], false)
        // No loc property set
        const context: JsxTaggerContext = { relativeFilename: "src/App.tsx" }

        const result = processJsxElement(divElement, context, t)

        expect(result).toBe(false)
        expect(divElement.attributes).toHaveLength(0)
      }))
  })
})
