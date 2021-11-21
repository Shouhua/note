let MagicString = require('magic-string')
let path = require('path')
const { parse } = require('acorn')
const analyse = require('./ast/analyse')

/**
 * 	每个文件都是一个module，每个module都会对应一个Module实例
 */
class Module {
	constructor({
		code,
		path,
		bundle
	}) {
		this.code = new MagicString(code, {
			filename: path
		})
		this.path = path
		this.bundle = bundle
		this.ast = parse(code, {
			ecmaVersion: 7,
			sourceType: 'module'	
		})
		this.analyse()
	}
	analyse() {
		analyse(this.ast, this.code, this)
	}
	expandAllStatements() {
		let allStatements = []
		this.ast.body.forEach(statement => {
			let statements = this.expandStatement(statement)
			allStatements.push(...statements)
		})
		return allStatements
	}
	// 找到当前节点依赖的变量，找到这些变量的声明语句
	// 这些语句可能是当前模块声明的，也有可能是在导入的模块声明的
	expandStatement(statement) {
		statement._included = true	
		let result = []
		result.push(statement)
		return result
	}
}

module.exports = Module