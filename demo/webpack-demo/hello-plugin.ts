import webpack from 'webpack'

const id = 'hello-loader-plugin'
const NS = 'hello-loader'

export default class HelloPlugin implements webpack.Plugin {
  static NS = NS
  apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap(id, compilation => {
      console.log('id: ', id);
      
      compilation.hooks.normalModuleLoader.tap(id, (loaderContext: any) => {
        loaderContext[NS] = true
      })

      compilation.hooks.buildModule.tap(id, (module: any) => {
        console.log(module.userRequest)
      })
    })
  }
}