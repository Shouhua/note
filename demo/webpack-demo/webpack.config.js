const path = require('path')
const HelloPlugin = require('./tsDist/hello-plugin.js').default

module.exports = {
  mode: 'development',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.(js|vue)$/,
        loader: require.resolve('./tsDist/hello-loader.js'),
        options: {
          hello: "world"
        }
      }
    ]
  },
  plugins: [
    new HelloPlugin()    
  ]
}