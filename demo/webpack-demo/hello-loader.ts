import webpack from 'webpack'
import loaderUtils from 'loader-utils'

export default function HelloLoader(this: webpack.loader.LoaderContext, source: string) {
  let loaderContext = this
  const stringifyRequest = (r: string) =>
    loaderUtils.stringifyRequest(loaderContext, r)

    const {
      mode,
      target,
      sourceMap,
      rootContext,
      resourcePath,
      resourceQuery
    } = loaderContext

    console.log('loader NS:', loaderContext['hello-loader']);
    

    const options = loaderUtils.getOptions(loaderContext) || {}
  return source
}