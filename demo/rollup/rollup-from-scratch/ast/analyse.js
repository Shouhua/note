function analyse(ast, magicString, module) {
	ast.body.forEach(statement => {
		Object.defineProperties(statement, {
			_source: {
				value: magicString.snip(statement.start, magicString.end)
			}
		})
	})
}

module.exports = analyse