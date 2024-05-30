import {
  CompilerDeprecationTypes,
  type DirectiveTransform,
  type ExpressionNode,
  NodeTypes,
  type SimpleExpressionNode,
  type SourceLocation,
  type TransformContext,
  transformOn as baseTransform,
  checkCompatEnabled,
  createCallExpression,
  createCompoundExpression,
  createObjectProperty,
  createSimpleExpression,
  isStaticExp,
} from '@vue/compiler-core'
import { V_ON_WITH_KEYS, V_ON_WITH_MODIFIERS } from '../runtimeHelpers'
import { capitalize, makeMap } from '@vue/shared'

// addEventListener(type, listener, options) options: {passive, once, capture}
// 其中passive表示event永远不会有target.preventDetault的行为发生，即使手动设置了，也会忽略
// addEventListener(type, listener, useCapture)
const isEventOptionModifier = /*#__PURE__*/ makeMap(`passive,once,capture`)
const isNonKeyModifier = /*#__PURE__*/ makeMap(
  // event propagation management
  `stop,prevent,self,` +
    // system modifiers + exact
    `ctrl,shift,alt,meta,exact,` +
    // mouse
    `middle`,
)
// left & right could be mouse or key modifiers based on event type
const maybeKeyModifier = /*#__PURE__*/ makeMap('left,right')
const isKeyboardEvent = /*#__PURE__*/ makeMap(
  `onkeyup,onkeydown,onkeypress`,
  true,
)

const resolveModifiers = (
  key: ExpressionNode,
  modifiers: string[],
  context: TransformContext,
  loc: SourceLocation,
) => {
  const keyModifiers = []
  const nonKeyModifiers = []
  const eventOptionModifiers = []

  for (let i = 0; i < modifiers.length; i++) {
    const modifier = modifiers[i]

    if (
      __COMPAT__ &&
      modifier === 'native' &&
      checkCompatEnabled(
        CompilerDeprecationTypes.COMPILER_V_ON_NATIVE,
        context,
        loc,
      )
    ) {
      eventOptionModifiers.push(modifier)
    } else if (isEventOptionModifier(modifier)) {
      // eventOptionModifiers: modifiers for addEventListener() options,
      // e.g. .passive & .capture
      eventOptionModifiers.push(modifier)
    } else {
      // runtimeModifiers: modifiers that needs runtime guards
      if (maybeKeyModifier(modifier)) {
        if (isStaticExp(key)) {
          if (isKeyboardEvent((key as SimpleExpressionNode).content)) {
            keyModifiers.push(modifier)
          } else {
            nonKeyModifiers.push(modifier)
          }
        } else {
          keyModifiers.push(modifier)
          nonKeyModifiers.push(modifier)
        }
      } else {
        if (isNonKeyModifier(modifier)) {
          nonKeyModifiers.push(modifier)
        } else {
          keyModifiers.push(modifier)
        }
      }
    }
  }

  return {
    keyModifiers,
    nonKeyModifiers,
    eventOptionModifiers,
  }
}

const transformClick = (key: ExpressionNode, event: string) => {
  const isStaticClick =
    isStaticExp(key) && key.content.toLowerCase() === 'onclick'
  return isStaticClick
    ? createSimpleExpression(event, true)
    : key.type !== NodeTypes.SIMPLE_EXPRESSION
      ? createCompoundExpression([
          `(`,
          key,
          `) === "onClick" ? "${event}" : (`,
          key,
          `)`,
        ])
      : key
}

export const transformOn: DirectiveTransform = (dir, node, context) => {
  return baseTransform(dir, node, context, baseResult => {
    const { modifiers } = dir
    if (!modifiers.length) return baseResult

    let { key, value: handlerExp } = baseResult.props[0]
    const { keyModifiers, nonKeyModifiers, eventOptionModifiers } =
      resolveModifiers(key, modifiers, context, dir.loc)

    // normalize click.right and click.middle since they don't actually fire
    if (nonKeyModifiers.includes('right')) {
      key = transformClick(key, `onContextmenu`)
    }
    if (nonKeyModifiers.includes('middle')) {
      key = transformClick(key, `onMouseup`)
    }

    if (nonKeyModifiers.length) {
      // _withModifiers($event => (_ctx.showHello = true), ["stop"])
      handlerExp = createCallExpression(context.helper(V_ON_WITH_MODIFIERS), [
        handlerExp,
        JSON.stringify(nonKeyModifiers),
      ])
    }

    if (
      keyModifiers.length &&
      // if event name is dynamic, always wrap with keys guard
      (!isStaticExp(key) || isKeyboardEvent(key.content))
    ) {
      // [("on" + _capitalize(_ctx.hello)) + "Passive"]: _cache[1] || _cache[1] = _withModifiers($event => (_ctx.showHello = true), ["stop"])
      handlerExp = createCallExpression(context.helper(V_ON_WITH_KEYS), [
        handlerExp,
        JSON.stringify(keyModifiers),
      ])
    }

    if (eventOptionModifiers.length) {
      const modifierPostfix = eventOptionModifiers.map(capitalize).join('')
      key = isStaticExp(key)
        ? createSimpleExpression(`${key.content}${modifierPostfix}`, true)
        : createCompoundExpression([`(`, key, `) + "${modifierPostfix}"`])
    }

    return {
      props: [createObjectProperty(key, handlerExp)],
    }
  })
}
