import { render } from "./App.vue?vue&type=template&id=7ba5bd90"
import script from "./App.vue?vue&type=script&lang=js"
export * from "./App.vue?vue&type=script&lang=js"

const cssModules = {}
import style0 from "./App.vue?vue&type=style&index=0&id=7ba5bd90&module=true&lang=css"
cssModules["$style"] = style0
if (module.hot) {
  module.hot.accept("./App.vue?vue&type=style&index=0&id=7ba5bd90&module=true&lang=css", () => {
    cssModules["$style"] = style0
    __VUE_HMR_RUNTIME__.rerender("7ba5bd90")
  })
}
import "./App.vue?vue&type=style&index=1&id=7ba5bd90&lang=css"

import exportComponent from "/Users/pengshouhua/demo/vue-loader/dist/exportHelper.js"
const __exports__ = /*#__PURE__*/exportComponent(script, [['render',render],['__cssModules',cssModules],['__file',"src/App.vue"]])
/* hot reload */
if (module.hot) {
  __exports__.__hmrId = "7ba5bd90"
  const api = __VUE_HMR_RUNTIME__
  module.hot.accept()
  if (!api.createRecord('7ba5bd90', __exports__)) {
    console.log('reload')
    api.reload('7ba5bd90', __exports__)
  }
  
  module.hot.accept("./App.vue?vue&type=template&id=7ba5bd90", () => {
    console.log('re-render')
    api.rerender('7ba5bd90', render)
  })

}


export default __exports__