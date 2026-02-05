import type { ReactElement } from "react"

/**
 * Renders a minimal UI for verifying component tagger output.
 *
 * @returns ReactElement
 *
 * @pure true
 * @invariant title and description test ids are present
 * @complexity O(1)
 */
// CHANGE: add a tiny React tree for Playwright assertions.
// WHY: ensure the component tagger can be verified in a real Next.js runtime.
// QUOTE(TZ): "Создай новый проект типо packages/frontend только создай его для nextjs и проверь будет ли работать всё тоже самое на нём"
// REF: issue-12
// SOURCE: n/a
// FORMAT THEOREM: forall render: render(Page) -> has(testIds)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: title/description are stable for e2e checks
// COMPLEXITY: O(1)/O(1)
export default function Home(): ReactElement {
  return (
    <main className="app">
      <h1 data-testid="title">Component Tagger Next.js Demo</h1>
      <p data-testid="description">Every JSX element is tagged with path.</p>
    </main>
  )
}
