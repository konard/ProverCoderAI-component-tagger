// CHANGE: expose the component tagger as the library entrypoint.
// WHY: provide a single import surface for consumers.
// QUOTE(TZ): "\u0423\u0431\u0435\u0440\u0438 \u0442\u0435\u043f\u0435\u0440\u044c \u0432\u0441\u0451 \u043b\u0438\u0448\u043d\u0438\u0435. \u0415\u0441\u043b\u0438 \u0447\u0442\u043e \u043c\u044b \u0434\u0435\u043b\u0430\u0435\u043c \u0431\u0438\u0431\u043b\u0438\u043e\u0442\u0435\u0447\u043d\u044b\u0439 \u043c\u043e\u0434\u0443\u043b\u044c \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043f\u0440\u043e\u0441\u0442\u043e \u0431\u0443\u0434\u0435\u043c \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u0442\u044c \u0432 \u043f\u0440\u043e\u0435\u043a\u0442\u044b"
// REF: user-2026-01-14-library-cleanup
// SOURCE: n/a
// FORMAT THEOREM: forall consumer: import(index) -> available(componentTagger)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: exports remain stable for consumers
// COMPLEXITY: O(1)/O(1)
export { componentPathAttributeName, formatComponentPathValue, isHtmlTag, isJsxFile } from "./core/component-path.js"
export {
  attrExists,
  createJsxTaggerVisitor,
  createPathAttribute,
  type JsxTaggerContext,
  type JsxTaggerOptions,
  processJsxElement,
  shouldTagElement
} from "./core/jsx-tagger.js"
export { componentTaggerBabelPlugin, type ComponentTaggerBabelPluginOptions } from "./shell/babel-plugin.js"
export { componentTagger } from "./shell/component-tagger.js"
