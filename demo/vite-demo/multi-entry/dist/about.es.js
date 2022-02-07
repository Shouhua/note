import { openBlock, createElementBlock } from "vue";
var _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const _sfc_main = {};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("h3", null, "About Page");
}
var module = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
var about = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": module
});
var routes = [
  {
    path: "/about",
    name: "about",
    component: () => Promise.resolve().then(function() {
      return about;
    })
  }
];
var _export = {
  module,
  routes
};
export { _export as default };
