import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

import {
  componentPathAttributeName,
  formatComponentPathValue,
  isJsxFile,
  normalizeModuleId
} from "../../src/core/component-path.js"

describe("component-path", () => {
  it.effect("exposes the path attribute name", () =>
    Effect.sync(() => {
      expect(componentPathAttributeName).toBe("path")
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
})
