import type { Metadata } from "next"
import type { ReactElement, ReactNode } from "react"

export const metadata: Metadata = {
  title: "Component Tagger Next.js Demo",
  description: "Every JSX element is tagged with path."
}

/**
 * Root layout for the Next.js application.
 *
 * @param children - Child components to render within the layout.
 * @returns ReactElement
 *
 * @pure true
 * @invariant children are rendered inside html/body structure
 * @complexity O(1)
 */
// CHANGE: add root layout for Next.js app router.
// WHY: Next.js 13+ requires a root layout for the app directory.
// QUOTE(TZ): "Создай новый проект типо packages/frontend только создай его для nextjs"
// REF: issue-12
// SOURCE: https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates
// FORMAT THEOREM: forall children: layout(children) -> html(body(children))
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: html structure is maintained
// COMPLEXITY: O(1)/O(1)
export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode
}>): ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
