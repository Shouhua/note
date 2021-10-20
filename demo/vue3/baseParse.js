// const compiler = require('@vue/compiler-core')
const compiler = require('@vue/compiler-dom')

const template = `
  <div v-if="isShow">
    helo {{ count }}
  </div>
`
// const ast = compiler.baseParse(
//   template
// )
const ast = compiler.parse(template)
console.log(ast)