const path = require('path')

const CLIENT_PUBLIC_PATH = `/@fakeVite/client`
const CLIENT_ENTRY = require.resolve('fakevite2/lib/client/client.js')
// eslint-disable-next-line node/no-missing-require
const ENV_ENTRY = require.resolve('fakevite2/lib/client/env.js')
const CLIENT_DIR = path.dirname(CLIENT_ENTRY)
const ENV_PUBLIC_PATH = `/@fakeVite/env`
const FS_PREFIX = `/@fs/`
const VALID_ID_PREFIX = `/@id/`
// ** READ THIS ** before editing `KNOWN_ASSET_TYPES`.
//   If you add an asset to `KNOWN_ASSET_TYPES`, make sure to also add it
//   to the TypeScript declaration file `packages/fakeVite/client.d.ts`.
const KNOWN_ASSET_TYPES = [
  // images
  'png',
  'jpe?g',
  'gif',
  'svg',
  'ico',
  'webp',
  'avif',

  // media
  'mp4',
  'webm',
  'ogg',
  'mp3',
  'wav',
  'flac',
  'aac',

  // fonts
  'woff2?',
  'eot',
  'ttf',
  'otf',

  // other
  'wasm',
  'webmanifest',
  'pdf'
]
const DEFAULT_ASSETS_RE = new RegExp(
  `\\.(` + KNOWN_ASSET_TYPES.join('|') + `)(\\?.*)?$`
)

const DEFAULT_MAIN_FIELDS = [
  'module',
  'jsnext:main', // moment still uses this...
  'jsnext'
]

const DEP_VERSION_RE = /[\?&](v=[\w\.-]+)\b/
const JS_TYPES_RE = /\.(?:j|t)sx?$|\.mjs$/
const OPTIMIZABLE_ENTRY_RE = /\.(?:m?js|ts)$/
const SPECIAL_QUERY_RE = /[\?&](?:worker|sharedworker|raw|url)\b/

/**
 * Plugins that use 'virtual modules' (e.g. for helper functions), prefix the
 * module ID with `\0`, a convention from the rollup ecosystem.
 * This prevents other plugins from trying to process the id (like node resolution),
 * and core features like sourcemaps can use this info to differentiate between
 * virtual modules and regular files.
 * `\0` is not a permitted char in import URLs so we have to replace them during
 * import analysis. The id will be decoded back before entering the plugins pipeline.
 * These encoded virtual ids are also prefixed by the VALID_ID_PREFIX, so virtual
 * modules in the browser end up encoded as `/@id/__x00__{id}`
 */
const NULL_BYTE_PLACEHOLDER = `__x00__`

const DEFAULT_EXTENSIONS = [
  '.mjs',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.json'
]

module.exports = {
	FS_PREFIX,
	DEFAULT_ASSETS_RE,
	DEP_VERSION_RE,
  JS_TYPES_RE,
  OPTIMIZABLE_ENTRY_RE,
  SPECIAL_QUERY_RE,
  CLIENT_PUBLIC_PATH,
  ENV_PUBLIC_PATH,
  VALID_ID_PREFIX,
  NULL_BYTE_PLACEHOLDER,
  CLIENT_ENTRY,
  CLIENT_DIR,
  ENV_ENTRY,
  DEFAULT_EXTENSIONS,
  DEFAULT_MAIN_FIELDS
}