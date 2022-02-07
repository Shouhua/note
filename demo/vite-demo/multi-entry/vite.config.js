import vue from '@vitejs/plugin-vue'

export default {
	plugins: [vue()],
	build: {
		minify: false,
		lib: {
      entry: './src/modules/home/export.js',
      name: 'MyLib',
      fileName: (format) => `my-lib.${format}.js`,
			formats: ['iife', 'es'],
    },
		rollupOptions: {
			external: ['vue', 'vue-router']
		},
		output: {
			file: 'bundle.js',
			format: 'iife',
			name: 'MyBundle'
		}
	}
}