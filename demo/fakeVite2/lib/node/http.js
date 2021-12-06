const { isObject } = require('./utils')
const fs = require('fs')
const { promises } = require('fs')
const path = require('path')
const { generate } = require('selfsigned')

async function createCertificate() {
  const pems = generate(null, {
    algorithm: 'sha256',
    days: 30,
    keySize: 2048,
    extensions: [
      // {
      //   name: 'basicConstraints',
      //   cA: true,
      // },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true,
        codeSigning: true,
        timeStamping: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          {
            // type 2 is DNS
            type: 2,
            value: 'localhost'
          },
          {
            type: 2,
            value: 'localhost.localdomain'
          },
          {
            type: 2,
            value: 'lvh.me'
          },
          {
            type: 2,
            value: '*.lvh.me'
          },
          {
            type: 2,
            value: '[::1]'
          },
          {
            // type 7 is IP
            type: 7,
            ip: '127.0.0.1'
          },
          {
            type: 7,
            ip: 'fe80::1'
          }
        ]
      }
    ]
  })
  return pems.private + pems.cert
}

async function getCertificate(cacheDir) {
  if (!cacheDir) return await createCertificate()

  const cachePath = path.join(cacheDir, '_cert.pem')

  try {
    const [stat, content] = await Promise.all([
      promises.stat(cachePath),
      promises.readFile(cachePath, 'utf8')
    ])

    if (Date.now() - stat.ctime.valueOf() > 30 * 24 * 60 * 60 * 1000) {
      throw new Error('cache is outdated.')
    }

    return content
  } catch {
    const content = await createCertificate()
    promises
      .mkdir(cacheDir, { recursive: true })
      .then(() => promises.writeFile(cachePath, content))
      .catch(() => {})
    return content
  }
}

function readFileIfExists(value) {
  if (typeof value === 'string') {
    try {
      return fs.readFileSync(path.resolve(value))
    } catch (e) {
      return value
    }
  }
  return value
}

async function resolveHttpsConfig(
  https,
  cacheDir
) {
  if (!https) return undefined

  const httpsOption = isObject(https) ? https : {}

  const { ca, cert, key, pfx } = httpsOption
  Object.assign(httpsOption, {
    ca: readFileIfExists(ca),
    cert: readFileIfExists(cert),
    key: readFileIfExists(key),
    pfx: readFileIfExists(pfx)
  })
  if (!httpsOption.key || !httpsOption.cert) {
    httpsOption.cert = httpsOption.key = await getCertificate(cacheDir)
  }
  return httpsOption
}

async function resolveHttpServer(
  { proxy },
  app,
  httpsOptions
) {
  if (!httpsOptions) {
    return require('http').createServer(app)
  }

  if (proxy) {
    // #484 fallback to http1 when proxy is needed.
    return require('https').createServer(httpsOptions, app)
  } else {
    return require('http2').createSecureServer(
      {
        ...httpsOptions,
        allowHTTP1: true
      },
      app
    )
  }
}

module.exports = {
	resolveHttpsConfig,
  resolveHttpServer
}