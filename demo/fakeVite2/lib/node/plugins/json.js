 const { dataToEsm } = require('@rollup/pluginutils')
 const { SPECIAL_QUERY_RE } = require('../constants')
 
 // Custom json filter for vite
 const jsonExtRE = /\.json($|\?)(?!commonjs-(proxy|external))/
 
function jsonPlugin(
	options = {},
	isBuild
 ) {
	 return {
		 name: 'fakeVite:json',
 
		 transform(json, id) {
			 if (!jsonExtRE.test(id)) return null
			 if (SPECIAL_QUERY_RE.test(id)) return null
 
			 try {
				 if (options.stringify) {
					 if (isBuild) {
						 return {
							 // during build, parse then double-stringify to remove all
							 // unnecessary whitespaces to reduce bundle size.
							 code: `export default JSON.parse(${JSON.stringify(
								 JSON.stringify(JSON.parse(json))
							 )})`,
							 map: { mappings: '' }
						 }
					 } else {
						 return `export default JSON.parse(${JSON.stringify(json)})`
					 }
				 }
 
				 const parsed = JSON.parse(json)
				 return {
					 code: dataToEsm(parsed, {
						 preferConst: true,
						 namedExports: options.namedExports
					 }),
					 map: { mappings: '' }
				 }
			 } catch (e) {
				 const errorMessageList = /[\d]+/.exec(e.message)
				 const position = errorMessageList && parseInt(errorMessageList[0], 10)
				 const msg = position
					 ? `, invalid JSON syntax found at line ${position}`
					 : `.`
				 this.error(`Failed to parse JSON file` + msg, e.idx)
			 }
		 }
	 }
 }
module.exports = {
	jsonPlugin
} 