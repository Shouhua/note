const parse = require('parseurl')

const request = {
  get url() {
    return this.req.url
  },

  get path() {
    return parse(this.req).pathname
  },

  get query() {
    return parse(this.req).query
  }
}

module.exports = request;