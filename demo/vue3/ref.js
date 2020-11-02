import { ref, proxyRefs } from 'vue'

let o = ref('hello')
// let b = proxyRefs({o})
// b.o = 'world'
o = 'world'
console.log(o)