import { defineConfig, type PluginOption } from "vite"
import { componentTagger } from "@prover-coder-ai/component-tagger"

// CHANGE: add a Vite config in the consumer package to validate plugin usage.
// WHY: ensure the packaged plugin integrates with Vite config typing in a clean module.
// QUOTE(ТЗ): "В твоём пак консумере должен был быть вайтконфиг файл"
// REF: user-2026-01-16-pack-consumer-vite
// SOURCE: n/a
// FORMAT THEOREM: ∀mode ∈ {development, production}: plugins(mode) is well-typed
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: plugin list contains only PluginOption values
// COMPLEXITY: O(1)/O(1)

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === "development"
  const plugins: PluginOption[] = isDevelopment ? [componentTagger()] : []

  return { plugins }
})
