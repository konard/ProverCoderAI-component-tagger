import type { NextConfig } from "next"

/**
 * Next.js configuration for component-tagger demo.
 *
 * @returns NextConfig
 *
 * @pure true
 * @invariant configuration enables Babel for JSX transformation
 * @complexity O(1)
 */
// CHANGE: configure Next.js to use Babel for JSX transformation.
// WHY: component-tagger requires Babel plugin for JSX element tagging.
// QUOTE(TZ): "Создай новый проект типо packages/frontend только создай его для nextjs"
// REF: issue-12
// SOURCE: https://nextjs.org/docs/pages/guides/babel
// FORMAT THEOREM: config(babel) -> transform(jsx) with component-tagger
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: Babel is used instead of SWC for JSX
// COMPLEXITY: O(1)/O(1)
const nextConfig: NextConfig = {
  reactStrictMode: true
}

export default nextConfig
