const rollup = require('rollup')
const replace = require('@rollup/plugin-replace')
const vue = require('rollup-plugin-vue')
const json = require('@rollup/plugin-json')
const fs = require('fs-extra')
const cjs = require('@rollup/plugin-commonjs')
const path = require('path')
const chalk = require('chalk')

const { nodeResolve } = require('@rollup/plugin-node-resolve')
const { cssPlugin } = require('./cssPlugin')
const { manifestPlugin } = require('./manifestPlugin')
const { createBuildAssetPlugin } = require('./assetPlugin')

const mainFields = ['module', 'jsnext', 'jsnext:main', 'browser', 'main']

const root = process.cwd()
const dynamicImport = require('rollup-plugin-dynamic-import-variables')
async function build(options) {
  let result
  const inputOptions = {
    input: 'src/main.js',
    plugins: [
      vue(),
      json(),
      nodeResolve({
        preferBuiltins: false,
        mainFields // 默认是['module', 'main']，对于debug这样的库这能找到cjs的版本，产生错误
      }),
      cjs({
        extensions: ['.js', '.cjs']
      }),
      dynamicImport({
        warnOnError: true,
        include: [/\.js$/],
        exclude: [/node_modules/]
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
        __buildDate__: () => JSON.stringify(new Date()),
        __buildVersion: 15, 
        preventAssignment: true
      }),
      cssPlugin({
        root,
        cssCodeSplit: options.cssCodeSplit
      }),
      createBuildAssetPlugin(process.cwd()),
      manifestPlugin(),
      createEmitPlugin(options.emitAssets, (assets) => {
        result = assets
      })
    ],
    onwarn(warning, warn) {
    	warn(warning)
    },
    // external: ['vue', 'lodash', 'debug'],
    preserveEntrySignatures: false,
    treeshake: { moduleSideEffects: 'no-external' }
  }
  if(options.minify) {
    inputOptions.plugins.push(require('rollup-plugin-terser').terser())
  }
  
  const outputOptions = {
    output: {
      format: 'es',
      dir: options.outDir,
      chunkFileNames: '[name]-[hash].js',
      assetFileNames: `${options.assetsDir}/[name]-[hash].[ext]`,
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
  const cssAssets = []
  const isCssAsset = (fileName) => fileName.endsWith('.css')

  for(let chunk of result) {
    let filePath = path.join('dist', chunk.fileName)
    if(chunk.type === 'chunk') {
      printFileInfo(filePath, chunk.code, WriteType.JS)
    } else if(chunk.source && options.emitAssets) {
      if(isCssAsset(chunk.fileName)) {
        cssAssets.unshift(chunk)
      }
      printFileInfo(
        filePath,
        chunk.source,
        isCssAsset(chunk.fileName) ? WriteType.CSS : WriteType.ASSET
      )
    }
  }

  let cssScript = ''
  if(!options.cssCodeSplit && cssAssets.length > 0) {
    cssAssets.forEach(asset => {
      cssScript += `\n<link rel="stylesheet" href="${asset.fileName}">`
    }) 
  }

  const indexHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fake Vite</title>${cssScript}
  </head>
  <body>
    <div id="app"></div> 
    <script type="module" src="./main.js"></script>
  </body>
  </html>
    `
  fs.writeFileSync(path.resolve(root, 'dist/index.html'), indexHtml)
  await build.close()
}

const WriteType = {
  'JS': 0,
  'CSS': 1,
  'ASSET': 2,
  'HTML': 3,
  'SOURCE_MAP': 4
}

const writeColors = Object.freeze({
  '0': chalk.cyan,
  '1': chalk.magenta,
  '2': chalk.green,
  '3': chalk.blue,
  '4': chalk.gray
})

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
    // `${chalk.gray(`[write]`)} ${writeColors[type](
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
      for(const asset of output) {
        bundle[asset.fileName] = asset
      }
    }
  }
}

module.exports = {
  build
}