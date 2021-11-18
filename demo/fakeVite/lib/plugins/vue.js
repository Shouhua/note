const { getContent, setCache } = require('../utils')
const path = require('path')
const { compileTemplate, parse } = require('@vue/compiler-sfc')
const url = require('url')
const { rewrite } = require('./rewrite')
const hash = require('hash-sum')
const { HMR_PATH } = require('./hmr')
const { parseSFC } = require('../utils/vueUtils')
const { compileCss } = require('../utils/cssUtils')
const { codegenCss, rewriteCssUrls } = require('./css')

const debug = require('debug')('fakeVite:vue')

function vuePlugin({ app, root }) {
  app.use(async (ctx, next) => {
    const parsed = url.parse(ctx.url, true)
    if(parsed.pathname.endsWith('.vue')) {
      const vuePath = path.resolve(root, ctx.path.slice(1))
      let content = getContent(vuePath)
      let [descriptor, prev] = parseSFC(content, vuePath)
      const query = parsed.query
      let code = `import {updateStyle} from '${HMR_PATH}'`
      let timestamp = ctx.query.t ? `&t=${ctx.query.t}` : ''
      if(!query.type) {
        let map
        if(descriptor.script) {
          code += rewrite(descriptor.script.content, true)
          map = descriptor.script.map
        }
        let hasScoped = false
        let hasCSSModules = false
        if(descriptor.styles) {
          descriptor.styles.forEach((s, i) => {
            const styleRequest = parsed.pathname + `?vue&type=style&index=${i}${timestamp}`
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
            // let css = JSON.stringify(s.content)
            // css = rewriteCssUrls(css, parsed.pathname)
            // code += `updateStyle("${hash(parsed.pathname)}-${i}", ${css})`
          })
        }
        if(descriptor.template) {
          code += `\nimport { render as __render } from "${parsed.pathname}?vue&type=template${timestamp}"`
          code += `\n__script.render = __render;`
        }
        code += `\n__script.__hmrId = ${JSON.stringify(parsed.pathname)}`
        code += `\n__script.__file = ${JSON.stringify(vuePath)}`
        ctx.body = code.trim()
        ctx.map = map
        ctx.response.type = 'application/javascript'
        return
      }
      let filename = path.join(root, parsed.pathname.slice(1))
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
            scopeId: descriptor.styles.some((s) => s.scoped) ? `data-v-${hash(parsed.pathname)}` : null,
            runtimeModuleName: '/@module/vue'
          },
          id: hash(parsed.pathname)
        })
        ctx.body = code
        ctx.map = map
      }
      if(query.type === 'style') {
        const id = hash(parsed.pathname)
        const index = Number(query.index)
        const styleBlock = descriptor.styles[index]
        const result = await parseStyle(root, parsed.pathname, {
          source: styleBlock.content,
          filename,
          scoped: styleBlock.scoped != null,
          modules: styleBlock.module != null
        })
        ctx.body = codegenCss(`${id}-${index}`, result.code, result.modules) 
      }
      ctx.response.type = 'application/javascript'
      return
    }
    return next()
  })
}

async function parseStyle(root, publicPath, {
  source,
  filename,
  scoped,
  modules,
}) {
  const result = await compileCss(root, publicPath, {
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