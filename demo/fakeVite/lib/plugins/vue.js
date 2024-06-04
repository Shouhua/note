const { getContent, setCache } = require('../utils')
const path = require('path')
const { compileTemplate, parse } = require('@vue/compiler-sfc')
const { rewrite } = require('./rewrite')
const hash = require('hash-sum')
const { HMR_PATH } = require('./client')
const { parseSFC } = require('../utils/vueUtils')
const { compileCss } = require('../utils/cssUtils')
const { codegenCss, rewriteCssUrls } = require('./css')

const debug = require('debug')('fakeVite:vue')

function vuePlugin({ app, root, resolver }) {
  app.use(async (ctx, next) => {
    if(!ctx.path.endsWith('.vue')) {
      return next()
    }
    const vuePath = path.resolve(root, ctx.path.slice(1))
    let content = getContent(vuePath)
    let [descriptor, prev] = parseSFC(content, vuePath)
    const query = ctx.query
    let code = `import {updateStyle} from '${HMR_PATH}'`
    let timestamp = ctx.query.t ? `&t=${ctx.query.t}` : ''
    if(!query.type) { // 原始请求, 比如/App.vue, 需要根据descriptor生成App.js文件
      let map
      if(descriptor.script) {
        code += rewrite(descriptor.script.content, true, resolver, ctx.path)
        map = descriptor.script.map
      }
      let hasScoped = false
      let hasCSSModules = false
      if(descriptor.styles) {
        const id = hash(ctx.path)
        descriptor.styles.forEach((s, i) => {
          const styleRequest = ctx.path + `?vue&type=style&index=${i}${timestamp}`
          if(s.scoped) hasScoped = true
          if(s.module) {
            if(!hasCSSModules) {
              code += `\nconst __cssModules = __script.__cssModules = {}`
              hasCSSModules = true
            }
            const styleVar = `__style${i}`
            const moduleName = typeof s.module === 'string' ? s.module : '$style'
            code += `\nimport ${styleVar} from ${JSON.stringify(styleRequest + '&module')}`
            code += `\n__cssModules[${JSON.stringify(moduleName)}] = ${styleVar}`
          } else {
            code += `\nimport ${JSON.stringify(styleRequest)}`
          }
          if(hasScoped) {
            code += `\n__script.__scopeId = "data-v-${id}"`
          }
        })
      }
      if(descriptor.template) {
        code += `\nimport { render as __render } from "${ctx.path}?vue&type=template${timestamp}"`
        code += `\n__script.render = __render;`
      }
      code += `\n__script.__hmrId = ${JSON.stringify(ctx.path)}`
      code += `\n__script.__file = ${JSON.stringify(vuePath)}`
      ctx.body = code.trim()
      ctx.map = map
      ctx.response.type = 'text/javascript'
      return
    }
    let filename = path.join(root, ctx.path.slice(1))
    if(query.type === 'template') {
      const { code, map } = compileTemplate({
        source: descriptor.template.content,
        filename,
        inMap: descriptor.template.map,
        transformAssetUrls: { 
          // 添加base后，img使用src不会新建新的import请求，原因是添加base后，不会将src地址hoist为import import_0 from './cx.jpeg', 因而不会产生新的import请求，而是直接使用static serve
          // 更底层是compiler-sfc中解析template时使用的函数transformSrcset里面的逻辑，如果有base，处理后直接返回了，没有hoist操作
          base: path.dirname(ctx.path)
        },
        compilerOptions: {
          scopeId: descriptor.styles.some((s) => s.scoped) ? `data-v-${hash(ctx.path)}` : null,
          runtimeModuleName: '/@module/vue'
        },
        id: hash(ctx.path)
      })
      ctx.body = code
      ctx.map = map
    }
    if(query.type === 'style') {
      const id = hash(ctx.path)
      const index = Number(query.index)
      const styleBlock = descriptor.styles[index]
      const result = await parseStyle(root, ctx.path, {
        source: styleBlock.content,
        filename,
        scoped: styleBlock.scoped != null,
        modules: styleBlock.module != null
      })
      ctx.body = codegenCss(`${id}-${index}`, result.code, result.modules) 
    }
    ctx.response.type = 'text/javascript'
    return
  })
}

async function parseStyle(root, publicPath, {
  source,
  filename,
  scoped,
  modules,
}) {
  const result = await compileCss(publicPath, {
    source,
    filename,
    scoped,
    modules
  })
  result.code = rewriteCssUrls(result.code, publicPath)
  return result
}

module.exports = {
  vuePlugin,
  parseStyle
}