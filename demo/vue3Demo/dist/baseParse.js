"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_core_1 = require("@vue/compiler-core");
/**
 * typescript调试
 * 首先新建task，然后在launch.json里面加入"preLaunchTask": "labelName"
 */
/**
 * [
 *    tag: 'template',
 *    type: NodeTypes.Element,
 *    props: [],
 *    codegenNode: undefined,
 *    tagType: ElementTypes.Element,
 *    children: [
 *      {
 *        tag:
 *      }
 *    ]
 * ]
 */
const rootNode = compiler_core_1.baseParse('<div :id="foo"/><div :id="bar"/>');
// const plugin: NodeTransform = (node, context) => {
//   if(node.type === NodeTypes.ELEMENT && node.tag === 'div') {
//     context.replaceNode(Object.assign({}, node, {
//       tag: 'p',
//       children: [{
//         type: NodeTypes.TEXT,
//         content: 'hello',
//         isEmpty: false
//       }]
//     }))
//   }
// }
const hoisted = [];
const plugin = (node, context) => {
    if (node.type === 1 /* ELEMENT */) {
        // NOTICE: node.props instanceof Array<AttributeNode | DirectiveNode>
        const dir = node.props[0];
        hoisted.push(dir.exp);
        dir.exp = context.hoist(dir.exp);
    }
};
compiler_core_1.transform(rootNode, {
    nodeTransforms: [plugin]
});
console.log(rootNode);
const { code, ast } = compiler_core_1.baseCompile(rootNode, {});
console.log(code, ast);
//# sourceMappingURL=baseParse.js.map