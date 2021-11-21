const path = require('path')
const rollup = require('./rollup')
let entry = path.resolve(__dirname, 'src/main.js')
rollup(entry, 'bundle.js')