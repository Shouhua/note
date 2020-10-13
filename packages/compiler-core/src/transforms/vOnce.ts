import { NodeTransform } from '../transform'
import { findDir } from '../utils'
import { ElementNode, ForNode, IfNode, NodeTypes } from '../ast'
import { SET_BLOCK_TRACKING } from '../runtimeHelpers'

// v-once setBlockTracking(-1),将当前的block不放入dynamicChildren中
// 只渲染元素和组件一次。随后的重新渲染，元素/组件及其所有的子节点将被视为静态内容并跳过。这可以用于优化更新性能
const seen = new WeakSet()

export const transformOnce: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT && findDir(node, 'once', true)) {
    if (seen.has(node)) {
      // 嵌套v-once，子代中跳过
      return
    }
    seen.add(node)
    // TODO： 这行是不是是可以放在有codegenNode下面，有种情况<template v-once v-if="true" v-slot/>
    // 这个时候是不会走vIf.ts的transfrom的，所以回来的时候也不会生成js_cache_expression，但是还是会有set_block_tracking的heler，
    // 在生成的render中还是会”import setBlockTracking as _setBlockTracking“
    context.helper(SET_BLOCK_TRACKING)
    return () => {
      const cur = context.currentNode as ElementNode | IfNode | ForNode
      if (cur.codegenNode) {
        cur.codegenNode = context.cache(cur.codegenNode, true /* isVNode */)
      }
    }
  }
}
