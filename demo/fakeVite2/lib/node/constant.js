const CLIENT_PUBLIC_PATH = `/@vite/client`
const ENV_PUBLIC_PATH = `/@vite/env`
const FS_PREFIX = `/@fs/`
const VALID_ID_PREFIX = `/@id/`
// ** READ THIS ** before editing `KNOWN_ASSET_TYPES`.
//   If you add an asset to `KNOWN_ASSET_TYPES`, make sure to also add it
//   to the TypeScript declaration file `packages/vite/client.d.ts`.
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
const DEP_VERSION_RE = /[\?&](v=[\w\.-]+)\b/
const JS_TYPES_RE = /\.(?:j|t)sx?$|\.mjs$/
const OPTIMIZABLE_ENTRY_RE = /\.(?:m?js|ts)$/
const SPECIAL_QUERY_RE = /[\?&](?:worker|sharedworker|raw|url)\b/


module.exports = {
	FS_PREFIX,
	DEFAULT_ASSETS_RE,
	DEP_VERSION_RE,
  JS_TYPES_RE,
  OPTIMIZABLE_ENTRY_RE,
  SPECIAL_QUERY_RE,
  CLIENT_PUBLIC_PATH,
  ENV_PUBLIC_PATH,
  VALID_ID_PREFIX
}