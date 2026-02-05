import type { ReactElement } from "react"

/**
 * Custom React Component for testing Component tagging.
 *
 * @returns ReactElement
 *
 * @pure true
 * @invariant component wrapper test id is present
 * @complexity O(1)
 */
// CHANGE: add custom React Component for integration tests.
// WHY: verify that Components are tagged according to tagComponents option in Next.js.
// QUOTE(TZ): "Есть тесты на <div /> и <MyComponent /> под разными настройками."
// REF: issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: forall render: render(CustomComponent) -> has(testId)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: wrapper div has test id for assertions
// COMPLEXITY: O(1)/O(1)
const CustomComponent = (): ReactElement => (
  <div data-testid="custom-component">Custom Component Content</div>
)

/**
 * Renders a minimal UI for verifying component tagger output.
 *
 * @returns ReactElement
 *
 * @pure true
 * @invariant title, description, and custom component test ids are present
 * @complexity O(1)
 */
// CHANGE: add a tiny React tree for Playwright assertions with both HTML and Component elements.
// WHY: ensure the component tagger can be verified in a real Next.js runtime for both element types.
// QUOTE(TZ): "Создай новый проект типо packages/frontend только создай его для nextjs и проверь будет ли работать всё тоже самое на нём"
// QUOTE(TZ): "Есть тесты на <div /> и <MyComponent /> под разными настройками."
// REF: issue-12, issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: forall render: render(Page) -> has(testIds)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: title/description/custom-component are stable for e2e checks
// COMPLEXITY: O(1)/O(1)
export default function Home(): ReactElement {
  return (
    <main className="app">
      <h1 data-testid="title">Component Tagger Next.js Demo</h1>
      <p data-testid="description">Every JSX element is tagged with path.</p>
      <CustomComponent />
    </main>
  )
}
