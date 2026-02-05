# @prover-coder-ai/component-tagger

Vite and Babel plugin that adds a `data-path` attribute to every JSX opening tag, enabling component source location tracking.

## Example output

```html
<h1 data-path="src/App.tsx:22:4">Hello</h1>
```

Format: `<relative-file-path>:<line>:<column>`

## Features

- ✅ **Idempotent**: adds `data-path` only if it doesn't already exist
- ✅ **HTML5 compliant**: uses standard `data-*` attributes
- ✅ **Configurable**: customize the attribute name via options
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

**With custom attribute name:**

```ts
const plugins = [
  isDevelopment && componentTagger({ attributeName: "data-component-path" })
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
            "attributeName": "data-component-path"
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
}
```

## Behavior Guarantees

- **Idempotency**: If `data-path` (or custom attribute) already exists on an element, no duplicate is added
- **Default attribute**: `data-path` is used when no `attributeName` is specified
- **Standard compliance**: Uses HTML5 `data-*` custom attributes by default
