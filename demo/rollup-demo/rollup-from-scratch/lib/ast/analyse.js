let Scope = require('./scope')
let walk = require('./walk')

// 哪些变量是本地的，哪些是外部的
function analyse(ast, magicString, module) {
	let scope = new Scope()
	ast.body.forEach(statement => {
		// 给作用域添加变量
		function addToScope(declaration) {
			let name = declaration.id.name
			scope.add(name)
			if(!scope.parent) {
				statement._defines[name] = true // 在全局作用域声明了全局变量
			}
		}
		Object.defineProperties(statement, {
			_defines: {
				value: {} // 存放当前模块定义的所有的全局变量
			},
			_dependsOn: { // 当前模块没有定义但是使用到的变量，也就是依赖的外部变量
				value: {}
			},
			_included: {
				value: false,
				writable: true
			},
			_source: {
				value: magicString.snip(statement.start, statement.end)
			}
		})
		// 构建作用域链
		walk(statement, {
			enter(node) {
				let newScope
				switch(node.type) {
					case 'FunctionDeclaration':
						const params = node.params.map(x => x.name)
						addToScope(node)
						// 如果是函数声明，创建新的作用域
						newScope = new Scope({
							parent: scope,
							params
						})
						break
					case 'VariableDeclaration':
						node.declarations.forEach(addToScope)
						break
				}
				if(newScope) {
					Object.defineProperty(node, '_scope', { value: newScope })
					scope = newScope
				}
			},
			leave(node) {
				if(node._scope) {
					scope = scope.parent
				}
			}
		})
	})
	ast.body.forEach(statement => {
		walk(statement, {
			enter(node) {
				if(!!node._scope) {
					scope = node._scope
				}
				if(scope && node.type === 'Identifier') {
					const definingScope = scope.findDefiningScope(node.name)
					if(!definingScope) {
						statement._dependsOn[node.name] = true //是外部依赖
					}
				}
			},
			leave(node) {
				if(node._scope) {
					scope = scope.parent
				}
			}
		})
	})
}

module.exports = analyse