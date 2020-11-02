"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_core_1 = require("@vue/compiler-core");
const ast = compiler_core_1.baseParse('<div v-focus></div>');
// transform(ast, {
//   nodeTransforms: [transformif]
// })
console.log(ast);
//# sourceMappingURL=baseParse.js.map