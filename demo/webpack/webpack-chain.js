const Config = require('webpack-chain')

const config = new Config()
config.entry('index').add('src/index.js').end()
  .entry('main').add('src/main.js').end()
  .output.path('dist').filename('[name].bundle.js')

config.output.libraryTarget('commonjs')
config.output.library('hello')

config.resolve.alias.set('vue', 'vue.esm.js')

config.devServer.hot(true)

config.module.rule('css').oneOf('inline').resourceQuery(/inline/).use('url-loader').end().end()

// console.log(config.entryPoints.delete('index'));

config.merge({devtool: 'source-map'})

config.when(process.env.NODE_ENV === 'SSR', config => )

console.log(config.toConfig());
module.exports = config.toConfig()