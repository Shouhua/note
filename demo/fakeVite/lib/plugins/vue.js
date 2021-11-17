const { getContent, setCache } = require('../utils')
const path = require('path')
const { compileScript, compileStyle, compileTemplate, parse } = require('@vue/compiler-sfc')
const url = require('url')
const { rewrite } = require('./rewrite')
const hash = require('hash-sum')
const { HMR_PATH } = require('./hmr')
const { parseMainSFC } = require('../utils/vueUtils')
const { rewriteCssUrls } = require('./css')

const debug = require('debug')('fakeVite:vue')

function vuePlugin({ app, root }) {
  app.use(async (ctx, next) => {
    const parsed = url.parse(ctx.url, true)
    if(parsed.pathname.endsWith('.vue')) {
      const vuePath = path.resolve(root, ctx.path.slice(1))
      let content = getContent(vuePath)
      let [descriptor, prev] = parseMainSFC(content, vuePath)
      const query = parsed.query
      let code = `import {updateStyle} from '${HMR_PATH}'`
      if(!query.type) {
        if(descriptor.script) {
          code += rewrite(descriptor.script.content, true)
        }
        if(descriptor.styles) {
          descriptor.styles.forEach((s, i) => {
            // code += `\nimport "${parsed.pathname}?vue&type=style&index=${i}"`
            // code += `updateStyle("${hash(parsed.pathname)}-${i}", "${parsed.pathname}?vue&type=style&index=${i}")`
            let css = JSON.stringify(s.content)
            css = rewriteCssUrls(css, parsed.pathname)
            code += `updateStyle("${hash(parsed.pathname)}-${i}", ${css})`
          })
        }
        if(descriptor.template) {
          code += `\nimport { render as __render } from "${parsed.pathname}?vue&type=template"`
          code += `\n__script.render = __render;`
        }
        code += `\n__script.__hmrId = ${JSON.stringify(parsed.pathname)}`
        code += `\n__script.__file = ${JSON.stringify(vuePath)}`
        ctx.body = code.trim()
        ctx.response.type = 'application/javascript'
        return
      }
      let filename = path.join(root, parsed.pathname.slice(1))
      if(query.type === 'template') {
        ctx.body = compileTemplate({
          source: descriptor.template.content,
          filename,
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
        }).code
      }
      if(query.type === 'style') {
        const id = hash(parsed.pathname)
        const code = compileStyle({
          source: descriptor.styles[Number(query.index)].content,
          id: `data-v-${id}`,
          filename,
          scoped: descriptor.styles[query.index].scoped
        }).code

        ctx.body = `${code}`
        ctx.response.type = 'text/css'
        return

  //       ctx.body = `
  // const id = "vue-style-${id}-${query.index}"
  // let style = document.getElementById(id)
  // if(!style) {
  //   style = document.createElement('style')
  //   style.id = id
  //   document.head.appendChild(style)
  // }
  // style.textContent = ${JSON.stringify(code)}
  //       `.trim()
      }
      ctx.response.type = 'application/javascript'
      return
    }
    return next()
  })
}

function parseScript() {

}

function parseTemplate() {

}

function parseStyle() {

}

module.exports = {
  vuePlugin,
  parseMainSFC,
  parseScript,
  parseTemplate,
  parseStyle
}