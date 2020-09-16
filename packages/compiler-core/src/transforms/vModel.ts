/**
 * Vue2.x 中我们会把 v-model 用在一些表单元素上，用于数据的双向绑定。

<input v-model="property />
但是，如果我们希望父子组件也能双向绑定时，Vue2.x 是不建议的，因为这会给父组件的维护带来灾难！
所以在 Vue2.x 中建议使用 this.$emit() 事件回传机制明确通知父组件，真正的更新还是父组件自己实现。
后来为了简化上述操作，在 Vue2.3.0 新增了 .sync 修饰符。
参考：cn.vuejs.org/v2/guide/co…
比如：父组件调用子组件 text-document 时，子组件就可以修改父组件的 doc.title。
<text-document v-bind:title.sync="doc.title"></text-document>
好了，通过以上描述我们可以得出结论:

v-model 可以实现表单元素的数据双向绑定
v-bind:xxx.sync 或者简写为 :xxx.sync 可以实现父子组件的双向绑定
那么在 Vue3.x 中得到了统一：
:xxx.sync 将被 v-model:xxx 取代
如果你希望跟子组件直接双向绑定，则：
<text-document v-model="doc"></text-document>
或者多个属性之间一一绑定：
<text-document 
    v-model:title="doc.title"
    v-model:content="doc.content"
></text-document>
 */
import { DirectiveTransform } from '../transform'
import {
  createSimpleExpression,
  createObjectProperty,
  createCompoundExpression,
  NodeTypes,
  Property,
  ElementTypes
} from '../ast'
import { createCompilerError, ErrorCodes } from '../errors'
import {
  isMemberExpression,
  isSimpleIdentifier,
  hasScopeRef,
  isStaticExp
} from '../utils'

export const transformModel: DirectiveTransform = (dir, node, context) => {
  const { exp, arg } = dir
  if (!exp) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_MODEL_NO_EXPRESSION, dir.loc)
    )
    return createTransformProps()
  }

  const expString =
    exp.type === NodeTypes.SIMPLE_EXPRESSION ? exp.content : exp.loc.source
  if (!isMemberExpression(expString)) {
    // foo.bar
    context.onError(
      createCompilerError(ErrorCodes.X_V_MODEL_MALFORMED_EXPRESSION, exp.loc)
    )
    return createTransformProps()
  }

  if (
    !__BROWSER__ &&
    context.prefixIdentifiers &&
    isSimpleIdentifier(expString) &&
    context.identifiers[expString]
  ) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_MODEL_ON_SCOPE_VARIABLE, exp.loc)
    )
    return createTransformProps()
  }

  // 默认v-mode会转化成modelValue, onUpdate:modelValue
  const propName = arg ? arg : createSimpleExpression('modelValue', true)
  const eventName = arg
    ? isStaticExp(arg)
      ? `onUpdate:${arg.content}`
      : createCompoundExpression(['"onUpdate:" + ', arg])
    : `onUpdate:modelValue`

  const props = [
    // modelValue: foo
    createObjectProperty(propName, dir.exp!),
    // "onUpdate:modelValue": $event => (foo = $event)
    createObjectProperty(
      eventName,
      createCompoundExpression([`$event => (`, exp, ` = $event)`])
    )
  ]

  // cache v-model handler if applicable (when it doesn't refer any scope vars)
  if (
    !__BROWSER__ &&
    context.prefixIdentifiers &&
    context.cacheHandlers &&
    !hasScopeRef(exp, context.identifiers)
  ) {
    props[1].value = context.cache(props[1].value)
  }

  // modelModifiers: { foo: true, "bar-baz": true }
  // <comp v-model:greet.trim='hello' />
  if (dir.modifiers.length && node.tagType === ElementTypes.COMPONENT) {
    const modifiers = dir.modifiers
      .map(m => (isSimpleIdentifier(m) ? m : JSON.stringify(m)) + `: true`)
      .join(`, `)
    const modifiersKey = arg
      ? isStaticExp(arg)
        ? `${arg.content}Modifiers`
        : createCompoundExpression([arg, ' + "Modifiers"'])
      : `modelModifiers`
    props.push(
      createObjectProperty(
        modifiersKey,
        createSimpleExpression(`{ ${modifiers} }`, false, dir.loc, true)
      )
    )
  }

  return createTransformProps(props)
}

function createTransformProps(props: Property[] = []) {
  return { props }
}
