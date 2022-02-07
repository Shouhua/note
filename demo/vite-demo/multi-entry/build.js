const fs = require('fs')
const path = require('path')
const vue = require('@vitejs/plugin-vue')
const { build } = require('vite')
const glob = require('fast-glob')

const entries = []

const getImports = async () => {
  const files = await glob('./src/modules/**/export.js')
  files.forEach(file => {
    const regex = new RegExp('.*\/(.*)\/export\.js')
    const results = regex.exec(file)
    entries.push({
      name: results[1],
      file
    })
  })
}

async function start() {
  await getImports()
  console.log(entries);
  entries.forEach(async item => {
    await build({
      configFile: false,
      build: {
        lib: {
          entry: item.file,
          name: item.name,
          formats: ['es'],
          fileName: format => `${item.name}.${format}.js`
        },
        rollupOptions: {
          external: ['vue', 'vue-router'],
          // output: {
          //   globals: {
          //     vue: 'Vue'
          //   },
          //   assetFileNames: `${item.name}/[name].[ext]`,
          //   entryFileNames: () => '[name]/[name].[format].js'
          // }
        }
      },
      plugins: [vue()]
    })
  })
}
start()
