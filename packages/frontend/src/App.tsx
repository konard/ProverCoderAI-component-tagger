/**
 * Custom React Component for testing Component tagging.
 *
 * @returns JSX.Element
 *
 * @pure true
 * @invariant component wrapper test id is present
 * @complexity O(1)
 */
// CHANGE: add custom React Component for integration tests.
// WHY: verify that Components are tagged according to tagComponents option.
// QUOTE(TZ): "Есть тесты на <div /> и <MyComponent /> под разными настройками."
// REF: issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: forall render: render(CustomComponent) -> has(testId)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: wrapper div has test id for assertions
// COMPLEXITY: O(1)/O(1)
const CustomComponent = (): JSX.Element => (
  <div data-testid="custom-component">Custom Component Content</div>
)

/**
 * Renders a minimal UI for verifying component tagger output.
 *
 * @returns JSX.Element
 *
 * @pure true
 * @invariant title, description, and custom component test ids are present
 * @complexity O(1)
 */
// CHANGE: add a tiny React tree for Playwright assertions with both HTML and Component elements.
// WHY: ensure the component tagger can be verified in a real frontend runtime for both element types.
// QUOTE(TZ): "Сам компонент должен быть в текущем app но вот что бы его протестировать надо создать ещё один проект который наш текущий апп будет подключать"
// QUOTE(TZ): "Есть тесты на <div /> и <MyComponent /> под разными настройками."
// REF: user-2026-01-14-frontend-consumer, issue-23
// SOURCE: https://github.com/ProverCoderAI/component-tagger/issues/23
// FORMAT THEOREM: forall render: render(App) -> has(testIds)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: title/description/custom-component are stable for e2e checks
// COMPLEXITY: O(1)/O(1)
export const App = (): JSX.Element => (
  <main className="app">
    <h1 data-testid="title">Component Tagger Demo</h1>
    <p data-testid="description">Every JSX element is tagged with path.</p>
    <CustomComponent />
  </main>
)
