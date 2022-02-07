export default {
	input: './main.js',
	output: {
		format: 'es',
		dir: 'dir'
	},
	plugins: [
		{
			name: 'test',
			buildStart() {
				this.emitFile({
					id: 'foobar.js',
					type: 'chunk',
					// code: `import foo from './foo';\nfoo();\nconsole.log('emit file')`,
					fileName: 'foobarEmitFile.js'
				})
			},
			renderChunk(code, chunk) {
				console.log('codeeeeeeeeeeeeee:')
				console.log(`${code}`)
				console.log(JSON.parse(JSON.stringify(chunk)))
				console.log(`${chunk.fileName} 依赖 ${Object.keys(chunk.modules).join('\n')}`);
				return null
			},
			generateBundle(options, bundle, isWrite) {
			}
		}
	]
}