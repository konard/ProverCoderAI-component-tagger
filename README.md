# @prover-coder-ai/component-tagger

Vite plugin that adds a single `path` attribute to every JSX opening tag.

Example output:

```html
<h1 path="src/App.tsx:22:4">Hello</h1>
```

Format: `<relative-file-path>:<line>:<column>`

Recommended: enable only in `development` mode in Vite config.
