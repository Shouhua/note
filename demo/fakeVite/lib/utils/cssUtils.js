const { compileStyleAsync } = require('@vue/compiler-sfc')
const hash_sum = require('hash-sum')

async function compileCss(root, publicPath, {
	source,
	filename,
	scoped,
	modules,
	id
}) {
	const result = await compileStyleAsync({
		id: id == null ? hash_sum(publicPath) : id,
		source,
		modules,
		scoped
	})
	return result
}

module.exports = {
	compileCss
}