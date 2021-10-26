const path = require('path')
const VueLoader = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
  mode: 'development',
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[chunkhash:8].js'
  },
  devtool: 'cheap-module-source-map',
  stats: 'minimal',
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'dist')
    },
    port: 9000
  },
  resolve: {
    extensions: ['.vue', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // vue$: 'vue/dist/vue.runtime.esm-bundler.js'
    }
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
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      // {
      //   test: /\.ts$/,
      //   loader: 'ts-loader'
      // },
      {
        test: /\.css$/,
        oneOf: [
          {
            resourceQuery: /module/, 
            use: ['vue-style-loader', {
              loader: 'css-loader',
              options: {
                // 开启 CSS Modules
                modules: {
                  // 自定义生成的类名
                  localIdentName: '[local]_[hash:base64:8]'
                },
              }
            }, 'postcss-loader']
          },
          {
            resourceQuery: /\?vue/,
            use: ['vue-style-loader', 'css-loader', 'postcss-loader']
          },
          {
            test: /\.module\.\w+$/,
            use: ['vue-style-loader',
              /* config.module.rule('css').oneOf('normal-modules').use('vue-style-loader') */
              /* config.module.rule('css').oneOf('normal-modules').use('css-loader') */
              {
                loader: 'css-loader',
                options: {
                  // sourceMap: false,
                  // importLoaders: 2,
                  modules: {
                    localIdentName: '[name]_[local]_[hash:base64:5]'
                  }
                }
              },
              /* config.module.rule('css').oneOf('normal-modules').use('postcss-loader') */
              'postcss-loader'
            ]
          },
          {
            use: ['vue-style-loader', 'css-loader', 'postcss-loader']
          }
        ]
      },
      {
        test: /\.scss$/,
        oneOf: [
          {
            resourceQuery: /module/, 
            use: ['vue-style-loader', {
              loader: 'css-loader',
              options: {
                // 开启 CSS Modules
                modules: {
                  // 自定义生成的类名
                  localIdentName: '[local]_[hash:base64:8]'
                },
              }
            }, 'postcss-loader', 'sass-loader']
          },
          {
            resourceQuery: /\?vue/,
            use: ['vue-style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
          },
          {
            test: /\.module\.\w+$/,
            use: ['vue-style-loader',
              /* config.module.rule('css').oneOf('normal-modules').use('vue-style-loader') */
              /* config.module.rule('css').oneOf('normal-modules').use('css-loader') */
              {
                loader: 'css-loader',
                options: {
                  // sourceMap: false,
                  // importLoaders: 2,
                  modules: {
                    localIdentName: '[name]_[local]_[hash:base64:5]'
                  }
                }
              },
              /* config.module.rule('css').oneOf('normal-modules').use('postcss-loader') */
              'postcss-loader', 'sass-loader'
            ]
          },
          {
            use: ['vue-style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
          }
        ]
      }
    ]
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          name: 'chunk-vendors',
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          chunks: 'initial'
        },
        common: {
          name: 'chunk-common',
          minChunks: 2,
          priority: -20,
          chunks: 'initial',
          reuseExistingChunk: true
        }
      }
    },
    minimizer: [
      /* config.optimization.minimizer('terser') */
      new TerserPlugin(
        {
          terserOptions: {
            compress: {
              arrows: false,
              collapse_vars: false,
              comparisons: false,
              computed_props: false,
              hoist_funs: false,
              hoist_props: false,
              hoist_vars: false,
              inline: false,
              loops: false,
              negate_iife: false,
              properties: false,
              reduce_funcs: false,
              reduce_vars: false,
              switches: false,
              toplevel: false,
              typeofs: false,
              booleans: true,
              if_return: true,
              sequences: true,
              unused: true,
              conditionals: true,
              dead_code: true,
              evaluate: true
            },
            mangle: {
              safari10: true
            },
            sourceMap: true,
            cache: true,
          },
          parallel: true,
          extractComments: false
        }
      )
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
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"development"',
        BASE_URL: '/'
      }
    }),
  ]
}