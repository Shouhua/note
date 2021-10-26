const path = require('path');
const VueLoader = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[hash:8].js'
  },
  devtool: 'cheap-module-source-map',
  devServer: {
    stats: 'minimal',
    contentBase: path.resolve(__dirname, 'dist'),
    port: 9000
  },
  resolve: {
    extensions: ['.vue', '.js']
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        exclude: /node_modules/,
        loader: 'vue-loader'
      },
      {
        test: /\.js$/,
        exclude: /node_modules|vue-next|demo/,
        loader: 'babel-loader'
      },
      // {
      //   test: /\.ts$/,
      //   loader: 'ts-loader'
      // },
      {
        test: /\.css$/,
        use: ['vue-style-loader', {
          loader: 'css-loader',
          options: {
            // 开启 CSS Modules
            modules: {
              // 自定义生成的类名
              localIdentName: '[local]_[hash:base64:8]'
            }
          }
        }]
      }
    ]
  },
  plugins: [
    new VueLoader.VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: 'index.html'
    }),
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false,
    }),
  ]
}