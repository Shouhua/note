import { isArray, isString, isObject, hyphenate } from './'
import { isNoUnitNumericStyleProp } from './domAttrConfig'

export type NormalizedStyle = Record<string, string | number>

// {foo: bar} || [{foo: bar}, {fooBar: foobar}] ==>
// {foo: bar; foo-bar: foobar}
export function normalizeStyle(value: unknown): NormalizedStyle | undefined {
  if (isArray(value)) {
    const res: Record<string, string | number> = {}
    for (let i = 0; i < value.length; i++) {
      const item = value[i]
      const normalized = normalizeStyle(
        isString(item) ? parseStringStyle(item) : item
      )
      if (normalized) {
        for (const key in normalized) {
          res[key] = normalized[key]
        }
      }
    }
    return res
  } else if (isObject(value)) {
    return value
  }
}

// foo: bar; foobar: fooBar) 这种情况的；是匹配不出的
const listDelimiterRE = /;(?![^(]*\))/g
const propertyDelimiterRE = /:(.+)/

/**
 * 主要是将style string转化成对象
 * 比如，"foo: bar; fooBar: fooBar" -> {foo: bar, fooBar: fooBar}
 */
export function parseStringStyle(cssText: string): NormalizedStyle {
  const ret: NormalizedStyle = {}
  cssText.split(listDelimiterRE).forEach(item => {
    if (item) {
      const tmp = item.split(propertyDelimiterRE)
      tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim())
    }
  })
  return ret
}

/**
 * 主要是将style对象转化成字符串'foo: bar; foo-bar: foobar'
 * key:
 * 1. 以--开头的key不管
 * 2. 驼峰key转化成kebab
 */
export function stringifyStyle(styles: NormalizedStyle | undefined): string {
  let ret = ''
  if (!styles) {
    return ret
  }
  for (const key in styles) {
    const value = styles[key]
    const normalizedKey = key.startsWith(`--`) ? key : hyphenate(key)
    if (
      isString(value) ||
      (typeof value === 'number' && isNoUnitNumericStyleProp(normalizedKey))
    ) {
      // only render valid values
      ret += `${normalizedKey}:${value};`
    }
  }
  return ret
}

// vnode中使用此函数时，value[name]已经经过执行了render(ctx, ...)，所以可以获得boolean值
// componentRenderUtils.ts中renderComponentRoot()，normalizeChildren(render.call(...args)), 此时已经将class中的value计算过了
export function normalizeClass(value: unknown): string {
  let res = ''
  if (isString(value)) {
    res = value
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      res += normalizeClass(value[i]) + ' '
    }
  } else if (isObject(value)) {
    for (const name in value) {
      if (value[name]) {
        res += name + ' '
      }
    }
  }
  return res.trim()
}
