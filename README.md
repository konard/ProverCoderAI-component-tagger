# @prover-coder-ai/component-tagger

Vite and Babel plugins that add a single `path` attribute to JSX elements for debugging and development tools.

Example output:

```html
<h1 path="src/App.tsx:22:4">Hello</h1>
<MyComponent path="src/App.tsx:25:2" />
```

Format: `<relative-file-path>:<line>:<column>`

## Features

- **Configurable Tagging Scope**: Control whether to tag only HTML elements or all JSX (including React Components)
- **Dual Plugin Support**: Works with both Vite (for dev servers) and Babel (for Next.js, CRA, etc.)
- **Functional Core Architecture**: Mathematically verified implementation with formal proofs
- **TypeScript First**: Full type safety with Effect-TS integration

## Configuration Options

### `tagComponents` (optional)

Controls whether React Components (PascalCase elements) are tagged in addition to HTML elements.

- `true` (default): Tag both HTML tags (`<div>`, `<h1>`) and React Components (`<MyComponent>`, `<Route>`)
- `false`: Tag only HTML tags (lowercase elements), skip React Components

**Mathematical Specification:**

```
Let JSX = HTML ∪ Component where:
  HTML = {x ∈ JSX | x[0] ∈ [a-z]}
  Component = {x ∈ JSX | x[0] ∈ [A-Z]}

Tagging predicate:
  shouldTag(element, config) =
    element ∈ HTML ∨ (config.tagComponents ∧ element ∈ Component)

Invariants:
  ∀ html ∈ HTML: shouldTag(html, _) = true
  ∀ comp ∈ Component: shouldTag(comp, {tagComponents: false}) = false
  ∀ comp ∈ Component: shouldTag(comp, {tagComponents: true}) = true
```

## Usage

### Vite Plugin

```ts
import { defineConfig, type PluginOption } from "vite"
import { componentTagger } from "@prover-coder-ai/component-tagger"

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === "development"
  const plugins = [
    isDevelopment && componentTagger({
      tagComponents: true // default: tag everything
    })
  ].filter(Boolean) as PluginOption[]

  return { plugins }
})
```

### Babel Plugin (Next.js)

**.babelrc:**

```json
{
  "presets": ["next/babel"],
  "env": {
    "development": {
      "plugins": [
        ["@prover-coder-ai/component-tagger/babel", {
          "tagComponents": true,
          "rootDir": "/custom/root"
        }]
      ]
    }
  }
}
```

### Babel Plugin (Other Projects)

**babel.config.js:**

```js
module.exports = {
  plugins: [
    ["@prover-coder-ai/component-tagger/babel", {
      tagComponents: false // only tag HTML elements
    }]
  ]
}
```

## Examples

### Default Behavior (Tag Everything)

```tsx
// Input
<div>
  <h1>Title</h1>
  <MyComponent />
</div>

// Output
<div path="src/App.tsx:1:0">
  <h1 path="src/App.tsx:2:2">Title</h1>
  <MyComponent path="src/App.tsx:3:2" />
</div>
```

### HTML-Only Mode (`tagComponents: false`)

```tsx
// Input
<div>
  <h1>Title</h1>
  <MyComponent />
</div>

// Output
<div path="src/App.tsx:1:0">
  <h1 path="src/App.tsx:2:2">Title</h1>
  <MyComponent />
</div>
```

## API

### Core Functions

```ts
import {
  isHtmlTag,
  isJsxFile,
  shouldTagElement,
  componentPathAttributeName
} from "@prover-coder-ai/component-tagger"

// Check if element name is HTML tag (lowercase)
isHtmlTag("div") // true
isHtmlTag("MyComponent") // false

// Check if file should be processed
isJsxFile("App.tsx") // true
isJsxFile("App.ts") // false

// Constant attribute name
componentPathAttributeName // "path"
```

## Architecture

This library follows the **Functional Core, Imperative Shell** pattern:

- **CORE** (Pure): `isHtmlTag`, `formatComponentPathValue`, `shouldTagElement` - all pure functions with mathematical properties
- **SHELL** (Effects): Vite and Babel plugin implementations that handle AST transformations

All functions are documented with:
- Formal mathematical theorems
- Complexity analysis (O-notation)
- Purity markers
- Effect specifications
