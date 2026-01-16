import { describe, expect, it } from "@effect/vitest"
import { Effect, pipe } from "effect"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import packageJsonData from "../../package.json" with { type: "json" }
import tsconfigBuildData from "../../tsconfig.build.json" with { type: "json" }

// CHANGE: validate package entrypoints against build outputs.
// WHY: prevent TS2307 by enforcing that published main/types resolve to built files.
// QUOTE(ТЗ): "Cannot find module '@prover-coder-ai/component-tagger' or its corresponding type declarations.ts(2307). Напиши под это тест"
// REF: user-2026-01-16-release-entrypoints
// SOURCE: n/a
// FORMAT THEOREM: ∀p ∈ {main, types}: exists(dist/p)
// PURITY: SHELL
// EFFECT: Effect<void, JsonError, never>
// INVARIANT: main/types/files align with tsconfig.build output
// COMPLEXITY: O(n)/O(1)

type JsonError = {
  readonly _tag: "JsonError"
  readonly path: string
  readonly reason: "Decode"
  readonly message: string
}

type PackageJson = {
  readonly main: string
  readonly types: string
  readonly files: ReadonlyArray<string>
}

type TsconfigBuild = {
  readonly compilerOptions: {
    readonly rootDir: string
    readonly outDir: string
  }
}

const jsonError = (pathValue: string, message: string): JsonError => ({
  _tag: "JsonError",
  path: pathValue,
  reason: "Decode",
  message
})

const isJsonRecord = (input: Json): input is { readonly [key: string]: Json } =>
  typeof input === "object" && input !== null && !Array.isArray(input)

const decodeString = (
  record: { readonly [key: string]: Json },
  key: string,
  pathValue: string
): Effect.Effect<string, JsonError> => {
  const value = record[key]
  return typeof value === "string"
    ? Effect.succeed(value)
    : Effect.fail(jsonError(pathValue, `Expected ${key} to be string`))
}

const decodeStringArray = (
  record: { readonly [key: string]: Json },
  key: string,
  pathValue: string
): Effect.Effect<ReadonlyArray<string>, JsonError> => {
  const value = record[key]
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return Effect.succeed(value)
  }
  return Effect.fail(jsonError(pathValue, `Expected ${key} to be string[]`))
}

const decodePackageJson = (input: Json, pathValue: string): Effect.Effect<PackageJson, JsonError> =>
  isJsonRecord(input)
    ? pipe(
      Effect.all({
        files: decodeStringArray(input, "files", pathValue),
        main: decodeString(input, "main", pathValue),
        types: decodeString(input, "types", pathValue)
      })
    )
    : Effect.fail(jsonError(pathValue, "Expected object"))

const decodeTsconfigBuild = (input: Json, pathValue: string): Effect.Effect<TsconfigBuild, JsonError> => {
  if (!isJsonRecord(input)) {
    return Effect.fail(jsonError(pathValue, "Expected object"))
  }
  const compilerOptions = input["compilerOptions"]
  if (compilerOptions === undefined || !isJsonRecord(compilerOptions)) {
    return Effect.fail(jsonError(pathValue, "Expected compilerOptions object"))
  }
  return pipe(
    Effect.all({
      outDir: decodeString(compilerOptions, "outDir", pathValue),
      rootDir: decodeString(compilerOptions, "rootDir", pathValue)
    }),
    Effect.map((options) => ({ compilerOptions: options }))
  )
}

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

const loadPackageJson = decodePackageJson(packageJsonData, "package.json")
const loadTsconfigBuild = decodeTsconfigBuild(tsconfigBuildData, "tsconfig.build.json")

const pathExists = (filePath: string): Effect.Effect<boolean> => Effect.sync(() => fs.existsSync(filePath))

describe("package entrypoints", () => {
  it.effect("aligns entrypoints with build output", () =>
    pipe(
      Effect.all({
        packageJson: loadPackageJson,
        tsconfigBuild: loadTsconfigBuild
      }),
      Effect.tap(({ packageJson, tsconfigBuild }) =>
        Effect.sync(() => {
          expect(tsconfigBuild.compilerOptions.rootDir).toBe("src")
          expect(tsconfigBuild.compilerOptions.outDir).toBe("dist")
          expect(packageJson.main).toBe("dist/index.js")
          expect(packageJson.types).toBe("dist/index.d.ts")
          expect(packageJson.files).toContain("dist")
        })
      ),
      Effect.flatMap(({ packageJson }) =>
        Effect.all({
          mainExists: pathExists(path.resolve(packageRoot, packageJson.main)),
          typesExists: pathExists(path.resolve(packageRoot, packageJson.types))
        })
      ),
      Effect.tap(({ mainExists, typesExists }) =>
        Effect.sync(() => {
          expect(mainExists).toBe(true)
          expect(typesExists).toBe(true)
        })
      ),
      Effect.asVoid
    ))
})
