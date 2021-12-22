const aliasPlugin = require('@rollup/plugin-alias')
const { preAliasPlugin } = require('./preAlias')
const { jsonPlugin } = require('./json')
const { importAnalysisPlugin } = require('./importAnalysis')
const { clientInjectionsPlugin } = require('./clientInjections')
const { resolvePlugin } = require('./resolve')
const { cssPlugin, cssPostPlugin } = require('./css')
const { assetPlugin } = require('./asset')
const { htmlInlineScriptProxyPlugin } = require('./html')

async function resolvePlugins(
  config,
  prePlugins,
  normalPlugins,
  postPlugins
) {
  const isBuild = config.command === 'build'

  const buildPlugins = isBuild
    ? (await import('../build')).resolveBuildPlugins(config)
    : { pre: [], post: [] }

  return [
    isBuild ? null : preAliasPlugin(),
    aliasPlugin({ entries: config.resolve.alias }),
    ...prePlugins,
    // config.build.polyfillModulePreload
    //   ? modulePreloadPolyfillPlugin(config)
    //   : null,
    resolvePlugin({
      ...config.resolve,
      root: config.root,
      isProduction: config.isProduction,
      isBuild,
      packageCache: config.packageCache,
      ssrConfig: config.ssr,
      asSrc: true
    }),
    // config.build.ssr ? ssrRequireHookPlugin(config) : null,
    htmlInlineScriptProxyPlugin(config),
    cssPlugin(config),
    // config.esbuild !== false ? esbuildPlugin(config.esbuild) : null,
    jsonPlugin(
      {
        namedExports: true,
        ...config.json
      },
      isBuild
    ),
    // wasmPlugin(config),
    // webWorkerPlugin(config),
    assetPlugin(config),
    ...normalPlugins,
    // definePlugin(config),
    cssPostPlugin(config),
    // ...buildPlugins.pre,
    // ...postPlugins,
    // ...buildPlugins.post,
    // internal server-only plugins are always applied after everything else
    ...(isBuild
      ? []
      : [clientInjectionsPlugin(config), importAnalysisPlugin(config)])
  ].filter(Boolean)
}

module.exports = {
  resolvePlugins
}