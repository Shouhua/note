import { isObject, toHandlerKey } from '@vue/shared'
import { warn } from '../warning'

/**
 * For prefixing keys in v-on="obj" with "on"
 * @private
 * 解析v-on没有args的情况
 * v-on={click: handleClick} => onClick = handleClick // 运行时解析
 */
export function toHandlers(
  obj: Record<string, any>,
  preserveCaseIfNecessary?: boolean,
): Record<string, any> {
  const ret: Record<string, any> = {}
  if (__DEV__ && !isObject(obj)) {
    warn(`v-on with no argument expects an object value.`)
    return ret
  }
  for (const key in obj) {
    ret[
      preserveCaseIfNecessary && /[A-Z]/.test(key)
        ? `on:${key}`
        : toHandlerKey(key)
    ] = obj[key]
  }
  return ret
}
