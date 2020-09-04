const http = require('http')
const Emitter = require('events')
const context = require('./context')
const request = require('./request')
const response = require('./response')
const util = require('util')

class Koa extends Emitter {
  constructor() {
    super()
    this.context = Object.create(context)
    this.request = Object.create(request)
    this.response = Object.create(response)
    this.middlewares = []
  }

  listen(...args) {
    const server = http.createServer(this.callback())
    return server.listen(...args)
  }

  use(fn) {
    this.middlewares.push(fn)
    return this
  }

  callback() {
    return async (req, res) => {
      const ctx = this.createContext(req, res)
      return await this.handleRequest(ctx)
    }
  }

  compose(ctx) {
    let next = function() {
      return Promise.resolve()
    }
    const _compose = function(middleware, next) {
      return async () => {
        await middleware(ctx, next)
      }
    }
    for(let i = this.middlewares.length -1; i > -1; i--) {
      next = _compose(this.middlewares[i], next)
    }
    return next()
  }

  responseBody(ctx) {
    const content = ctx.body
    if(typeof content === 'string' || Buffer.isBuffer(content)) {
      ctx.res.end(content)
    } else if(typeof content === 'object') {
      ctx.res.end(JSON.stringify(conent))
    }
  }

  async handleRequest(ctx) {
    const response = () => this.responseBody(ctx)
    return this.compose(ctx).then(response).catch(onerror)
  }

  createContext(req, res) {
    const context = Object.create(this.context)
    const request = Object.create(this.request)
    const response = Object.create(this.response)

    // req实际上是原始的rquest对象
    context.app = request.app = response.app = this
    context.req = request.req = response.req = req
    context.res = request.res = response.res = res
    context.request = request
    context.response = response

    request.ctx = response.ctx = context
    request.response = response
    response.request = request
    return context
  }

  onError(err) {
    if(!err instanceof Error) {
      throw new TypeError(util.format('error thrown: %j', err))
    }
    if(404 === err.status || err.expose) return
  }
}

module.exports = Koa