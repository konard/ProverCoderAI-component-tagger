import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

import {
  componentPathAttributeName,
  formatComponentPathValue,
  isHtmlTag,
  isJsxFile,
  normalizeModuleId
} from "../../src/core/component-path.js"

describe("component-path", () => {
  it.effect("exposes the data-path attribute name", () =>
    Effect.sync(() => {
      expect(componentPathAttributeName).toBe("data-path")
    }))

  it.effect("formats the component path payload", () =>
    Effect.sync(() => {
      const result = formatComponentPathValue("src/App.tsx", 12, 3)
      expect(result).toBe("src/App.tsx:12:3")
    }))

  it.effect("detects JSX/TSX module ids", () =>
    Effect.sync(() => {
      expect(isJsxFile("src/App.tsx")).toBe(true)
      expect(isJsxFile("src/App.jsx?import")).toBe(true)
      expect(isJsxFile("src/App.ts")).toBe(false)
    }))

  it.effect("normalizes module id by stripping query string", () =>
    Effect.sync(() => {
      // With query parameter
      expect(normalizeModuleId("src/App.tsx?import")).toBe("src/App.tsx")
      expect(normalizeModuleId("src/App.jsx?v=123")).toBe("src/App.jsx")
      expect(normalizeModuleId("src/App.tsx?import&v=abc")).toBe("src/App.tsx")

      // Without query parameter (idempotent)
      expect(normalizeModuleId("src/App.tsx")).toBe("src/App.tsx")
      expect(normalizeModuleId("src/App.jsx")).toBe("src/App.jsx")

      // Edge cases
      expect(normalizeModuleId("")).toBe("")
      expect(normalizeModuleId("?")).toBe("")
      expect(normalizeModuleId("file?")).toBe("file")
    }))

  describe("isHtmlTag", () => {
    // CHANGE: add unit tests for isHtmlTag predicate.
    // WHY: ensure correct classification of HTML vs React Component elements.
    // QUOTE(TZ): "Есть тесты на <div /> и <MyComponent /> под разными настройками."
    // REF: issue-23
    // SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
    // FORMAT THEOREM: ∀ name: isHtmlTag(name) ↔ name[0] ∈ [a-z]
    // PURITY: CORE
    // EFFECT: n/a
    // INVARIANT: predicate correctly classifies HTML vs Component elements
    // COMPLEXITY: O(1)/O(1)

    it.effect("returns true for lowercase HTML tags", () =>
      Effect.sync(() => {
        expect(isHtmlTag("div")).toBe(true)
        expect(isHtmlTag("h1")).toBe(true)
        expect(isHtmlTag("span")).toBe(true)
        expect(isHtmlTag("p")).toBe(true)
        expect(isHtmlTag("main")).toBe(true)
        expect(isHtmlTag("article")).toBe(true)
      }))

    it.effect("returns false for PascalCase React Components", () =>
      Effect.sync(() => {
        expect(isHtmlTag("MyComponent")).toBe(false)
        expect(isHtmlTag("Route")).toBe(false)
        expect(isHtmlTag("App")).toBe(false)
        expect(isHtmlTag("Button")).toBe(false)
      }))

    it.effect("returns false for empty string", () =>
      Effect.sync(() => {
        expect(isHtmlTag("")).toBe(false)
      }))

    it.effect("returns false for strings starting with non-letter characters", () =>
      Effect.sync(() => {
        expect(isHtmlTag("123div")).toBe(false)
        expect(isHtmlTag("_component")).toBe(false)
        expect(isHtmlTag("$button")).toBe(false)
      }))

    it.effect("handles single-character element names", () =>
      Effect.sync(() => {
        expect(isHtmlTag("a")).toBe(true)
        expect(isHtmlTag("A")).toBe(false)
        expect(isHtmlTag("b")).toBe(true)
        expect(isHtmlTag("B")).toBe(false)
      }))
  })
})
