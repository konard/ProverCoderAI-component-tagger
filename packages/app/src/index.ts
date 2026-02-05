// CHANGE: expose the component tagger as the library entrypoint.
// WHY: provide a single import surface for consumers.
// QUOTE(TZ): "Убери теперь всё лишние. Если что мы делаем библиотечный модуль который просто будем подключать в проекты"
// REF: user-2026-01-14-library-cleanup
// SOURCE: n/a
// FORMAT THEOREM: forall consumer: import(index) -> available(componentTagger)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: exports remain stable for consumers
// COMPLEXITY: O(1)/O(1)
export {
  componentPathAttributeName,
  formatComponentPathValue,
  isHtmlTag,
  isJsxFile,
  normalizeModuleId
} from "./core/component-path.js"
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
export { componentTagger, type ComponentTaggerOptions } from "./shell/component-tagger.js"
