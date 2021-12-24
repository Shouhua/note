import { terser } from 'rollup-plugin-terser'

export default {
	input: 'src/main.js',
	output: {
		dir: 'dist',
		format: 'es',
		sourcemap: true
	},
	plugins: [
		terser()
	]
}