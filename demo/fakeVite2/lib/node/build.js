const path = require('path')

function resolveBuildOptions(
  root,
  raw
) {
  const resolved = {
    target: 'modules',
    polyfillModulePreload: true,
    outDir: 'dist',
    assetsDir: 'assets',
    assetsInlineLimit: 4096,
    cssCodeSplit: !raw.lib,
    cssTarget: false,
    sourcemap: false,
    rollupOptions: {},
    minify: raw.ssr ? false : 'esbuild',
    terserOptions: {},
    write: true,
    emptyOutDir: null,
    manifest: false,
    lib: false,
    ssr: false,
    ssrManifest: false,
    reportCompressedSize: true,
    // brotliSize: true,
    chunkSizeWarningLimit: 500,
    watch: null,
    ...raw,
    commonjsOptions: {
      include: [/node_modules/],
      extensions: ['.js', '.cjs'],
      ...raw.commonjsOptions
    },
    dynamicImportVarsOptions: {
      warnOnError: true,
      exclude: [/node_modules/],
      ...raw.dynamicImportVarsOptions
    }
  }

  const resolve = (p) =>
    p.startsWith('\0') ? p : path.resolve(root, p)

  resolved.outDir = resolve(resolved.outDir)

  let input

  if ((raw.rollupOptions || {}).input) {
    input = Array.isArray(raw.rollupOptions.input)
      ? raw.rollupOptions.input.map((input) => resolve(input))
      : typeof raw.rollupOptions.input === 'object'
      ? Object.fromEntries(
          Object.entries(raw.rollupOptions.input).map(([key, value]) => [
            key,
            resolve(value)
          ])
        )
      : resolve(raw.rollupOptions.input)
  } else {
    input = resolve(
      raw.lib
        ? raw.lib.entry
        : typeof raw?.ssr === 'string'
        ? raw.ssr
        : 'index.html'
    )
  }

  if (!!raw.ssr && typeof input === 'string' && input.endsWith('.html')) {
    throw new Error(
      `rollupOptions.input should not be an html file when building for SSR. ` +
        `Please specify a dedicated SSR entry.`
    )
  }

  resolved.rollupOptions.input = input

  // handle special build targets
  if (resolved.target === 'modules') {
    // Support browserslist
    // "defaults and supports es6-module and supports es6-module-dynamic-import",
    resolved.target = [
      'es2019',
      'edge88',
      'firefox78',
      'chrome87',
      'safari13.1'
    ]
  } else if (resolved.target === 'esnext' && resolved.minify === 'terser') {
    // esnext + terser: limit to es2019 so it can be minified by terser
    resolved.target = 'es2019'
  }

  if (!resolved.cssTarget) {
    resolved.cssTarget = resolved.target
  }

  // normalize false string into actual false
  if ((resolved.minify) === 'false') {
    resolved.minify = false
  }

  if (resolved.minify === true) {
    resolved.minify = 'esbuild'
  }

  return resolved
}

module.exports = {
	resolveBuildOptions
}