# @prover-coder-ai/component-tagger

Vite and Babel plugin that adds a `data-path` attribute to every JSX opening tag, enabling component source location tracking.

## Example output

```html
<h1 data-path="src/App.tsx:22:4">Hello</h1>
<CustomButton data-path="src/App.tsx:25:6">Click me</CustomButton>
```

Format: `<relative-file-path>:<line>:<column>`

## Features

- ✅ **Idempotent**: adds `data-path` only if it doesn't already exist
- ✅ **HTML5 compliant**: uses standard `data-*` attributes
- ✅ **Configurable attribute**: customize the attribute name via options
- ✅ **Configurable scope**: control whether to tag HTML elements only or all JSX (HTML + React Components)
- ✅ **Dual plugin support**: works with both Vite and Babel

## Installation

```bash
npm install @prover-coder-ai/component-tagger
```

## Usage

### Vite Plugin

```ts
import { defineConfig, type PluginOption } from "vite"
import { componentTagger } from "@prover-coder-ai/component-tagger"

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === "development"
  const plugins = [isDevelopment && componentTagger()].filter(Boolean) as PluginOption[]

  return { plugins }
})
```

**With options:**

```ts
const plugins = [
  isDevelopment && componentTagger({
    attributeName: "data-component-path",  // Custom attribute name
    tagComponents: true                    // Tag both HTML and React Components (default)
  })
].filter(Boolean) as PluginOption[]
```

**Tag HTML elements only:**

```ts
const plugins = [
  isDevelopment && componentTagger({
    tagComponents: false  // Only tag <div>, <h1>, etc., skip <MyComponent>
  })
].filter(Boolean) as PluginOption[]
```

### Babel Plugin (e.g., Next.js)

Add to your `.babelrc`:

```json
{
  "presets": ["next/babel"],
  "env": {
    "development": {
      "plugins": ["@prover-coder-ai/component-tagger/babel"]
    }
  }
}
```

**With options:**

```json
{
  "presets": ["next/babel"],
  "env": {
    "development": {
      "plugins": [
        [
          "@prover-coder-ai/component-tagger/babel",
          {
            "rootDir": "/custom/root",
            "attributeName": "data-component-path",
            "tagComponents": true
          }
        ]
      ]
    }
  }
}
```

## Options

### Vite Plugin Options

```ts
type ComponentTaggerOptions = {
  /**
   * Name of the attribute to add to JSX elements.
   * @default "data-path"
   */
  attributeName?: string
  /**
   * Whether to tag React Components (PascalCase elements) in addition to HTML tags.
   * - true: Tag both HTML tags (<div>) and React Components (<MyComponent>)
   * - false: Tag only HTML tags (<div>), skip React Components (<MyComponent>)
   * @default true
   */
  tagComponents?: boolean
}
```

### Babel Plugin Options

```ts
type ComponentTaggerBabelPluginOptions = {
  /**
   * Root directory for computing relative paths.
   * @default process.cwd()
   */
  rootDir?: string
  /**
   * Name of the attribute to add to JSX elements.
   * @default "data-path"
   */
  attributeName?: string
  /**
   * Whether to tag React Components (PascalCase elements) in addition to HTML tags.
   * - true: Tag both HTML tags (<div>) and React Components (<MyComponent>)
   * - false: Tag only HTML tags (<div>), skip React Components (<MyComponent>)
   * @default true
   */
  tagComponents?: boolean
}
```

## Tagging Scope: HTML vs React Components

By default, the plugin tags **all JSX elements** (both HTML tags and React Components). You can customize this behavior with the `tagComponents` option.

### Default Behavior (tag everything)

```tsx
// Input
<div>
  <h1>Hello</h1>
  <MyComponent />
</div>

// Output
<div data-path="src/App.tsx:5:0">
  <h1 data-path="src/App.tsx:6:2">Hello</h1>
  <MyComponent data-path="src/App.tsx:7:2" />
</div>
```

### HTML Only Mode (`tagComponents: false`)

```tsx
// Input
<div>
  <h1>Hello</h1>
  <MyComponent />
</div>

// Output
<div data-path="src/App.tsx:5:0">
  <h1 data-path="src/App.tsx:6:2">Hello</h1>
  <MyComponent />  {/* Not tagged */}
</div>
```

### Classification Rules

- **HTML elements** (lowercase, e.g., `div`, `h1`, `span`): Always tagged
- **React Components** (PascalCase, e.g., `MyComponent`, `Button`): Tagged only when `tagComponents !== false`

## Behavior Guarantees

- **Idempotency**: If `data-path` (or custom attribute) already exists on an element, no duplicate is added
- **Default attribute**: `data-path` is used when no `attributeName` is specified
- **Default scope**: All JSX elements are tagged when `tagComponents` is not specified
- **HTML always tagged**: HTML elements (lowercase tags) are always tagged regardless of `tagComponents` setting
- **Standard compliance**: Uses HTML5 `data-*` custom attributes by default
