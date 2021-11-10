import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve'
import copy from 'rollup-plugin-copy'
import json from '@rollup/plugin-json'

export default {
	input: 'server.js',
	output: {
		dir: 'dist',
		format: 'cjs'
	},
	plugins: [
		json(),
		commonjs(),
		nodeResolve(),
		copy({
			targets: [
				{ src: 'client.js', dest: 'dist' }
			]
		})
	]
}