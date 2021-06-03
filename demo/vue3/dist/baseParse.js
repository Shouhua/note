import { baseParse as parse } from '@vue/compiler-core';
const ast = parse('<div v-focus></div>');
// transform(ast, {
//   nodeTransforms: [transformif]
// })
console.log(ast);
//# sourceMappingURL=baseParse.js.map