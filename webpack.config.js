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
        exclude: /node_modules|vue-next|demo/,
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
        use: ['style-loader', 'css-loader', 'sass-loader', 'postcss-loader']
      }
    ]
  },
  plugins: [
    new VueLoader.VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: 'index.html'
    })
  ]
}