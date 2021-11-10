import { getContent, setCache } from '../utils/utils'
import { resolve } from 'path'
import path from 'path'
import { compileScript, compileStyle, compileTemplate, parse } from '@vue/compiler-sfc'
import url from 'url'
import { rewrite } from './rewrite'
import hash from 'hash-sum'

const cache = new Map()
const debug = require('debug')('fakeVite:vue')

export default function vueMiddleware(ctx, next) {
  const parsed = url.parse(ctx.url, true)
  if(parsed.pathname.endsWith('.vue')) {
    const vuePath = resolve(ctx.cwd, ctx.path.slice(1))
    let content = getContent(vuePath)
    let descriptor = parseMainSFC(content, vuePath)[0]
    cache.set(vuePath, descriptor)
    const query = parsed.query
    let code = ''
    if(!query.type) {
      if(descriptor.script) {
        code += rewrite(descriptor.script.content, true)
      }
      if(descriptor.styles) {
        descriptor.styles.forEach((s, i) => {
          code += `\nimport "${parsed.pathname}?vue&type=style&index=${i}"`
        })
      }
      if(descriptor.template) {
        code += `\nimport { render as __render } from "${parsed.pathname}?vue&type=template"`
        code += `\n__script.render = __render;`
      }
      ctx.body = code.trim()
      ctx.response.type = 'application/javascript'
      return;
    }
    let filename = path.join(ctx.cwd, parsed.pathname.slice(1))
    if(query.type === 'template') {
      ctx.body = compileTemplate({
        source: descriptor.template.content,
        filename,
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

      ctx.body = `
const id = "vue-style-${id}-${query.index}"
let style = document.getElementById(id)
if(!style) {
  style = document.createElement('style')
  style.id = id
  document.head.appendChild(style)
}
style.textContent = ${JSON.stringify(code)}
      `.trim()
    }
    ctx.response.type = 'application/javascript'
  }
	return next()
}

export function parseMainSFC(content, filename) {
  const descriptor = parse(content, {
    filename
  }).descriptor
  return [descriptor, cache.get(filename)]
}

export function parseScript() {

}

export function parseTemplate() {

}

export function parseStyle() {

}