import { types as t } from "@babel/core"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

import { processJsxElement, shouldTagElement } from "../../src/core/jsx-tagger.js"
import {
  createJsxElement,
  createJsxElementWithLocation,
  createNamespacedElement,
  createTestContext
} from "./jsx-test-fixtures.js"

// CHANGE: add comprehensive tests for tagComponents configuration in separate file.
// WHY: reduce file length to stay under 300-line limit while maintaining full test coverage.
// QUOTE(TZ): "Есть тесты на <div /> и <MyComponent /> под разными настройками."
// REF: issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: ∀ elem, opts: shouldTagElement(elem, opts) satisfies configurable tagging invariants
// PURITY: CORE (tests pure functions)
// EFFECT: n/a
// INVARIANT: tests verify mathematical properties of tagging predicates
// COMPLEXITY: O(1) per test

describe("jsx-tagger: shouldTagElement scoping", () => {
  describe("HTML tags (lowercase)", () => {
    it.effect("always tags HTML elements regardless of options", () =>
      Effect.sync(() => {
        const divElement = createJsxElement(t, "div")
        const h1Element = createJsxElement(t, "h1")

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
        const myComponent = createJsxElement(t, "MyComponent")
        const route = createJsxElement(t, "Route")

        expect(shouldTagElement(myComponent, { tagComponents: true }, t)).toBe(true)
        expect(shouldTagElement(route, { tagComponents: true }, t)).toBe(true)
      }))

    it.effect("skips Components when tagComponents is false", () =>
      Effect.sync(() => {
        const myComponent = createJsxElement(t, "MyComponent")
        const route = createJsxElement(t, "Route")

        expect(shouldTagElement(myComponent, { tagComponents: false }, t)).toBe(false)
        expect(shouldTagElement(route, { tagComponents: false }, t)).toBe(false)
      }))

    it.effect("tags Components by default (undefined options)", () =>
      Effect.sync(() => {
        const myComponent = createJsxElement(t, "MyComponent")
        const route = createJsxElement(t, "Route")

        // Default behavior: tag everything
        expect(shouldTagElement(myComponent, undefined, t)).toBe(true)
        expect(shouldTagElement(route, undefined, t)).toBe(true)
      }))

    it.effect("tags Components by default (empty options object)", () =>
      Effect.sync(() => {
        const myComponent = createJsxElement(t, "MyComponent")
        const route = createJsxElement(t, "Route")

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
        const namespacedElement = createNamespacedElement(t, "svg", "path")

        expect(shouldTagElement(namespacedElement, { tagComponents: true }, t)).toBe(true)
        expect(shouldTagElement(namespacedElement, { tagComponents: false }, t)).toBe(true)
      }))

    it.effect("skips namespaced elements with uppercase namespace", () =>
      Effect.sync(() => {
        // Custom:Element - namespace is uppercase "Custom"
        const namespacedElement = createNamespacedElement(t, "Custom", "Element")

        expect(shouldTagElement(namespacedElement, { tagComponents: true }, t)).toBe(true)
        expect(shouldTagElement(namespacedElement, { tagComponents: false }, t)).toBe(false)
      }))
  })

  describe("processJsxElement integration with tagComponents", () => {
    it.effect("tags HTML elements with default options", () =>
      Effect.sync(() => {
        const divElement = createJsxElementWithLocation(t, "div", 1, 0)
        const context = createTestContext()

        const result = processJsxElement(divElement, context, t)

        expect(result).toBe(true)
        expect(divElement.attributes).toHaveLength(1)
      }))

    it.effect("tags React Components with tagComponents: true", () =>
      Effect.sync(() => {
        const myComponent = createJsxElementWithLocation(t, "MyComponent", 5, 2)
        const context = createTestContext("src/App.tsx", "data-path", { tagComponents: true })

        const result = processJsxElement(myComponent, context, t)
        expect(result).toBe(true)
        expect(myComponent.attributes).toHaveLength(1)
      }))

    it.effect("skips React Components with tagComponents: false", () =>
      Effect.sync(() => {
        const myComponent = createJsxElementWithLocation(t, "MyComponent", 5, 2)
        const context = createTestContext("src/App.tsx", "data-path", { tagComponents: false })

        const result = processJsxElement(myComponent, context, t)
        expect(result).toBe(false)
        expect(myComponent.attributes).toHaveLength(0)
      }))

    it.effect("tags React Components by default (no options)", () =>
      Effect.sync(() => {
        const myComponent = createJsxElementWithLocation(t, "Route", 10, 4)
        const context = createTestContext("src/Routes.tsx")

        const result = processJsxElement(myComponent, context, t)
        expect(result).toBe(true)
        expect(myComponent.attributes).toHaveLength(1)
      }))
  })
})
