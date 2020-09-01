const fs = require('fs')
const path = require('path')

const file = fs.createWriteStream(path.resolve(__dirname, './writeFile.txt'))
for(let i = 0; i < 10; i++) {
  file.write(`${i} `)
}

const read = fs.createReadStream(path.resolve(__dirname, './writeFile.txt'))
console.log('read file...')
read.on('data', (chunk) => {
  console.log(chunk)
})
.on('end', () => {
  console.log('end...')
})