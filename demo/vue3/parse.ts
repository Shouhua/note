import { CompilerOptions, baseParse as parse } from '@vue/compiler-core'

const dom = `<hello>
<template #="slotProps">
  {{ helo.greet}}
  {{slotProps.greet}}
</template>
</hello>`

const result = parse(dom)

console.log(result)