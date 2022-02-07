const fs = require('fs-extra')
const Module = require('./module')
const MagicString = require('magic-string')
const path = require('path')

class Bundle {
	constructor(options) {
		this.entryPath = options.entry.replace(/\.js$/, '') + '.js'
		this.modules = {} // 存放着所有模块，入口文件和她所依赖的模块
	}
	build(outputFileName) {
		let entryModule = this.fetchModule(this.entryPath)
		// 把这个入口模块所有语句进行展开，返回所有语句组成的数组
		this.statements = entryModule.expandAllStatements()
		const { code } = this.generate()
		fs.writeFileSync(outputFileName,  code, 'utf-8')
	}
	fetchModule(importee, importer) {
		let route
		if(!importer) {
			route = importee 
		} else {
			if(path.isAbsolute(importee)) {
				route = importee
			} else if(importee[0] === '.') {
				route = path.resolve(path.dirname(importer), importee.replace(/\.js$/, '')+'.js')
			}
		}
		if(route) {
			let code = fs.readFileSync(route, 'utf-8')
			let module = new Module({
				code,
				path: route,
				bundle: this
			})
			return module
		}
	}
	// 把this.statement生成代码
	generate() {
		let magicString = new MagicString.Bundle()
		this.statements.forEach(statement => {
			const source = statement._source.clone()
			if(statement.type === 'ExportNamedDeclaration') {
				source.remove(statement.start, statement.declaration.start)
			}
			magicString.addSource({
				content: source,
				separator: '\n'
			})
		})
		return {
			code: magicString.toString()
		}
	}
}

module.exports = Bundle