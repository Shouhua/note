import { NodeTransform } from '../transform'
import { findDir } from '../utils'
import { NodeTypes } from '../ast'
import { SET_BLOCK_TRACKING } from '../runtimeHelpers'

// v-once setBlockTracking(-1),将当前的block不放入dynamicChildren中
// 只渲染元素和组件一次。随后的重新渲染，元素/组件及其所有的子节点将被视为静态内容并跳过。这可以用于优化更新性能
export const transformOnce: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT && findDir(node, 'once', true)) {
    context.helper(SET_BLOCK_TRACKING)
    return () => {
      if (node.codegenNode) {
        node.codegenNode = context.cache(node.codegenNode, true /* isVNode */)
      }
    }
  }
}
