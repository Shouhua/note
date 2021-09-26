// const compiler = require('@vue/compiler-core')
const compiler = require('@vue/compiler-dom')

const template = `
  <template v-for="item in list" v-slot="{item}">
    {{ item }} 
    <slot name="header" />
  </template>
  <script>
    console.log('')
    </script>
`
// const ast = compiler.baseParse(
//   template
// )
const ast = compiler.parse(template, {
  scopeId: 123,
  mode: 'module',
  padding: false
})
console.log(ast)