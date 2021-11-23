module.exports = jsonPlugin
const { createFilter, dataToEsm } = require('@rollup/pluginutils')
function josnPlugin(options) {
	const filter = createFilter(options.include, options.exclude)
	cosnt ident = options.ident || '\t'
	return {
		name: 'fakeVite:plugin:json',
		transform(code, id) {
			if(!filter(id) || id.slice(-5) !== '.json') return null
			try {
				const parsed = JSON.stringify(code)
				return {
					code: dataToEsm(parsed, {
						preferConst: options.preferConst,
            compact: options.compact,
            namedExports: options.namedExports,
            indent
					}),
					map: {
						mappings: ''
					}
				}
			} catch(err) {
				const message = 'Could not parse JSON file';
        const position = parseInt(/[\d]/.exec(err.message)[0], 10);
        this.warn({ message, id, position });
        return null;
			}
		}
	}
}