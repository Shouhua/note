const rollup = require('rollup')
const replace = require('@rollup/plugin-replace')
const vue = require('rollup-plugin-vue')
const json = require('@rollup/plugin-json')
const fs = require('fs-extra')
const cjs = require('@rollup/plugin-commonjs')
const path = require('path')

const { nodeResolve } = require('@rollup/plugin-node-resolve')
const { cssPlugin } = require('./cssPlugin')
const { manifestPlugin } = require('./manifestPlugin')
const { createBuildAssetPlugin } = require('./assetPlugin')

const mainFields = ['module', 'jsnext', 'jsnext:main', 'browser', 'main']

async function build(options) {
  let result
  const inputOptions = {
    input: 'src/main.js',
    plugins: [
      json(),
      vue(),
      nodeResolve({
        mainFields // 默认是['module', 'main']，对于debug这样的库这能找到cjs的版本，产生错误
      }),
      cjs({
        extensions: ['.js', '.cjs']
      }),
      cssPlugin({
        root: process.cwd()
      }),
      createBuildAssetPlugin(process.cwd()),
      manifestPlugin(),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
        __buildDate__: () => JSON.stringify(new Date()),
        __buildVersion: 15, 
        preventAssignment: true
      }),
      createEmitPlugin(options.emitAssets, (assets) => {
        result = assets
      })
    ],
    onwarn(warning, warn) {
    	warn(warning)
    },
  }
  if(options.minify) {
    inputOptions.plugins.push(require('rollup-plugin-terser').terser())
  }
  
  const outputOptions = {
    output: {
      format: 'es',
      dir: 'dist',
      chunkFileNames: '[name]-[hash].js',
      sourcemap: true,
      manualChunks(id) {
        if (id.includes('node_modules')) {
          return 'vendor';
        }
      }
    }
  }
  const build = await rollup.rollup(inputOptions)
  fs.emptyDirSync(outputOptions.output.dir)
  const output = await build.write(outputOptions)
  const root = process.cwd()
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fake Vite</title>
<script type="module" src="./main.js"></script>
</head>
<body>
<div id="app"></div> 
</body>
</html>
  `
  fs.writeFileSync(path.resolve(root, 'dist/index.html'), indexHtml)
  for(let asset in result) {
    console.log(JSON.stringify(asset))
  }
  await build.close()
}

function printFileInfo(
  filePath,
  content,
  type
) {
  const needCompression =
    type === WriteType.JS || type === WriteType.CSS || type === WriteType.HTML

  const compressed = needCompression
    ? `, brotli: ${(require('brotli-size').sync(content) / 1024).toFixed(2)}kb`
    : ``

  console.log(
    `${chalk.gray(`[write]`)} ${writeColors[type](
      path.relative(process.cwd(), filePath)
    )} ${(content.length / 1024).toFixed(2)}kb${compressed}`
  )
}

function createEmitPlugin(emitAssets, emit) {
  return {
    name: 'fakeVite:emit',
    generateBundle(options, bundle) {
      const output = Object.values(bundle)
      emit(output)
    }
  }
}

module.exports = {
  build
}