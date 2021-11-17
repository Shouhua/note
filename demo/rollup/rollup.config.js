// import { terser } from 'rollup-plugin-terser'
import css from './cssPlugin'
function renderChunkTestPlugin() {
  return {
    name: 'fakeVite:render-chunk',
    async renderChunk(code, chunk, options) {
      console.log(code)
      console.log(chunk)
      console.log(options)
      return {
        code: 'just for test' + code,
        map: null
      }
    }
  }
}

export default {
  input: './src/index.js',
  output: {
    dir: 'dist',
    name: 'bundle.[hash].js',
    format: 'esm'
  },
  plugins: [
    css(false)
    // renderChunkTestPlugin()
    // terser({
    //   compress: {
    //     side_effects: true
    //   }
    // })
  ]
}