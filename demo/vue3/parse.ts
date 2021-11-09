// import { baseParse as parse } from '@vue/compiler-core'
const { baseParse: parse } = require('@vue/compiler-core')

const dom = `
  <template>
  helo,world
  </template>
  <script>
  console.log('')
  </script>
  <style>
  .red {
    color: red
  }
  </style>
`

const result = parse(dom)

console.log(result)