/**
 * result[0] = result[0].toUpperCase()
 * 这个赋值表达式不会改变result的值，因为string是不能改变单个引用的值
 * string没有splice方法，可能跟上面的原因有关系
 */

result = result[0].toUpperCase() + result.slice(1)

/**
 * js基本类型：string, number, boolean, null, undefined, bigint, symbol
 * typeof result string: string, number, boolean, object, undefined, function, symbol, bigdata
 */