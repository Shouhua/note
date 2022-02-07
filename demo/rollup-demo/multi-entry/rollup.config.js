// import multi from '@rollup/plugin-multi-entry';

// export default {
//   input: ['batman.js', 'robin.js'],
//   output: {
//     dir: 'output'
//   },
//   plugins: [multi()]
// };
export default [
	{
		input: 'batman.js',
		output: {
			dir: 'dist',
			name: '[name].[hash:6].js'
		}
	},
	{
		input: 'robin.js',
		output: {
			dir: 'dist',
			name: '[name].[hash:6].js'
		}
	}
]