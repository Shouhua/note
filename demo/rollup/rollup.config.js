import { terser } from 'rollup-plugin-terser'

export default {
  input: './index.js',
  output: {
    file: 'bundle.js',
    format: 'esm'
  },
  plugins: [
    terser({
      compress: {
        side_effects: true
      }
    })
  ]
}