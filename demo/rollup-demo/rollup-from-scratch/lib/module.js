let MagicString = require('magic-string')
let path = require('path')
const { parse } = require('acorn')
const analyse = require('./ast/analyse')
function hasOwnProperty(obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop)
}

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
		this.imports = {}
		this.exports = {}
		this.ast.body.forEach(node => {
			// import
			if(node.type === 'ImportDeclaration') {
				let source = node.source.value // import from where 
				let specifiers = node.specifiers
				specifiers.forEach(specifier => {
					const name = specifier.imported.name
					const localName = specifier.local.name
					this.imports[localName] = {
						name,
						localName,
						source
					}
				})
			// } else if(/^Export/.test(node.type)) { // export
			} else if(node.type === 'ExportNamedDeclaration') {
				let declaration = node.declaration
				if(declaration.type === 'VariableDeclaration') {
					let name = declaration.declarations[0].id.name
					this.exports[name] = {
						node,
						localName: name,
						expression: declaration
					}
				}
			}
		})
		// 哪些变量是本地的，哪些是外部的
		analyse(this.ast, this.code, this) // _defines and _dependsOn
		this.definitions = {} // 存放所有全局变量定义语句
		this.ast.body.forEach(statement => {
			Object.keys(statement._defines).forEach(name => {
				// key是全局变量名，值是定义这个全局变量的语句，用于展开的时候拷贝过去
				this.definitions[name] = statement
			})
		})
	}
	expandAllStatements() {
		let allStatements = []
		this.ast.body.forEach(statement => {
			if(statement.type === 'ImportDeclaration') return // 导入不要
			let statements = this.expandStatement(statement)
			allStatements.push(...statements)
		})
		return allStatements
	}
	// 找到当前节点依赖的变量，找到这些变量的声明语句
	// 这些语句可能是当前模块声明的，也有可能是在导入的模块声明的
	expandStatement(statement) {
		let result = []
		const dependencies = Object.keys(statement._dependsOn) // 外部依赖
		dependencies.forEach(name => {
			// 找到定义声明变量的节点，可能在当前模块内，可能在依赖的模块里面
			let definition = this.define(name)
			result.push(...definition)
		})
		if(!statement._included) {
			statement._included = true	
			result.push(statement)
		}
		return result
	}
	define(name) {
		if(hasOwnProperty(this.imports, name)) {
			const importData = this.imports[name]
			const module = this.bundle.fetchModule(importData.source, this.path)
			const exportData = module.exports[importData.name]
			return module.define(exportData.localName)
		} else {
			let statement = this.definitions[name]
			if(statement && !statement._included) {
				return this.expandStatement(statement)
			} else {
				return []
			}
		}
	}
}

module.exports = Module