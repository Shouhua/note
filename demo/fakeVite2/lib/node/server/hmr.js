const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { createDebugger, normalizePath } = require('../utils')
const { CLIENT_DIR } = require('../constants')
const { isMatch } = require('micromatch')
const { isCSSRequest } = require('../plugins/css')

const debugHmr = createDebugger('fakeVite:hmr')
const normalizeClientDir = normalizePath(CLIENT_DIR)

function getShortName(file, root) {
  return file.startsWith(root + '/') ? path.posix.relative(root, file) : file
}

async function handleHMRUpdate(file, server) {
  const { ws, config, moduleGraph } = server
  const shortFile = getShortName(file, config.root)
  const isConfig = file === config.configFile
  const isConfigDependency = config.configFileDependencies.some(name => file === path.resolve(name))

  const isEnv = config.inlineConfig.envFile !== false && (file === '.env' || file.startsWith('.env.'))
  if(isConfig || isConfigDependency || isEnv) {
    debugHmr(`[config change] ${chalk.dim(shortFile)}`)
    config.logger.info(
      chalk.green(
        `${path.relative(process.cwd(), file)} changed, restarting server...`
      ),
      { clear: true, timestamp: true }
    )
    await server.restart()
    return
  }
  debugHmr(`[file change] ${chalk.dim(shortFile)}`)

  if(file.startsWith(normalizeClientDir)) {
    ws.send({
      type: 'full-reload',
      path: '*'
    })
    return
  }
  const mods = moduleGraph.getModulesByFile(file)
  const timestamp = Date.now()
  const hmrContext = {
    file,
    timestamp,
    modules: mods ? [...mods] : [],
    read: () => readModifiedFile(file),
    server
  }
  for(const plugin of config.plugins) {
    if(plugin.handleHotUpdate) {
      const filteredModules = await plugin.handleHotUpdate(hmrContext)
      if(filteredModules) {
        hmrContext.modules = filteredModules
      }
    }
  }
  if(!hmrContext.modules.length) {
    if(file.endsWith('.html')) {
      config.logger.info(chalk.green(`page reload `) + chalk.dim(shortFile), {
        clear: true,
        timestamp: true
      })
      ws.send({
        type: 'full-reload',
        path: config.server.middlewareMode ? '*' : '/' + normalizePath(path.relative(config.root, file))
      })
    } else {
      debugHmr(`[no modules matched] ${chalk.dim(shortFile)}`)
    }
    return
  }
  updateModules(shortFile, hmrContext.modules, timestamp, server)
}

function updateModules(file, modules, timestamp, { config, ws }) {
  const updates = []
  const invalidateModules = new Set()
  let needFullReload = false
  for(const mod of modules) {
    invalidate(mod, timestamp, invalidateModules)
    if(needFullReload) {
      continue
    }
    const boundaries = new Set()
    const hasDeadEnd = propagateUpdate(mod, boundaries)
    if(hasDeadEnd) {
      needFullReload = true
      continue
    }
    updates.push(
      ...[...boundaries].map(({ boundary, acceptedVia }) => ({
        type: `${boundary.type}-update`,
        timestamp,
        path: boundary.url,
        acceptedPath: acceptedVia.url
      }))
    )
  }
  if (needFullReload) {
    config.logger.info(chalk.green(`page reload `) + chalk.dim(file), {
      clear: true,
      timestamp: true
    })
    ws.send({
      type: 'full-reload'
    })
  } else {
    config.logger.info(
      updates
        .map(({ path }) => chalk.green(`hmr update `) + chalk.dim(path))
        .join('\n'),
      { clear: true, timestamp: true }
    )
    ws.send({
      type: 'update',
      updates
    })
  }
}

// vitejs/vite#610 when hot-reloading Vue files, we read immediately on file
// change event and sometimes this can be too early and get an empty buffer.
// Poll until the file's modified time has changed before reading again.
async function readModifiedFile(file) {
  const content = fs.readFileSync(file, 'utf-8')
  if (!content) {
    const mtime = fs.statSync(file).mtimeMs
    await new Promise((r) => {
      let n = 0
      const poll = async () => {
        n++
        const newMtime = fs.statSync(file).mtimeMs
        if (newMtime !== mtime || n > 10) {
          r(0)
        } else {
          setTimeout(poll, 10)
        }
      }
      setTimeout(poll, 10)
    })
    return fs.readFileSync(file, 'utf-8')
  } else {
    return content
  }
}

function invalidate(mod, timestamp, seen) {
  if (seen.has(mod)) {
    return
  }
  seen.add(mod)
  mod.lastHMRTimestamp = timestamp
  mod.transformResult = null
  mod.ssrModule = null
  mod.ssrTransformResult = null
  mod.importers.forEach((importer) => {
    if (!importer.acceptedHmrDeps.has(mod)) {
      invalidate(importer, timestamp, seen)
    }
  })
}

function propagateUpdate(node, boundaries, currentChain = [node]) {
  if (node.isSelfAccepting) {
    boundaries.add({
      boundary: node,
      acceptedVia: node
    })

    // additionally check for CSS importers, since a PostCSS plugin like
    // Tailwind JIT may register any file as a dependency to a CSS file.
    for (const importer of node.importers) {
      if (isCSSRequest(importer.url) && !currentChain.includes(importer)) {
        propagateUpdate(importer, boundaries, currentChain.concat(importer))
      }
    }

    return false
  }

  if (!node.importers.size) {
    return true
  }

  // #3716, #3913
  // For a non-CSS file, if all of its importers are CSS files (registered via
  // PostCSS plugins) it should be considered a dead end and force full reload.
  if (
    !isCSSRequest(node.url) &&
    [...node.importers].every((i) => isCSSRequest(i.url))
  ) {
    return true
  }

  for (const importer of node.importers) {
    const subChain = currentChain.concat(importer)
    if (importer.acceptedHmrDeps.has(node)) {
      boundaries.add({
        boundary: importer,
        acceptedVia: node
      })
      continue
    }

    if (currentChain.includes(importer)) {
      // circular deps is considered dead end
      return true
    }

    if (propagateUpdate(importer, boundaries, subChain)) {
      return true
    }
  }
  return false
}

function handlePrunedModules(mods, { ws }) {
  // update the disposed modules' hmr timestamp
  // since if it's re-imported, it should re-apply side effects
  // and without the timestamp the browser will not re-import it!
  const t = Date.now()
  mods.forEach((mod) => {
    mod.lastHMRTimestamp = t
    debugHmr(`[dispose] ${chalk.dim(mod.file)}`)
  })
  ws.send({
    type: 'prune',
    paths: [...mods].map((m) => m.url)
  })
}

const LexerState = {
  inCall: 0,
  inSingleQuoteString: 1,
  inDoubleQuoteString: 2,
  inTemplateString: 3,
  inArray: 4
}
/**
 * Lex import.meta.hot.accept() for accepted deps.
 * Since hot.accept() can only accept string literals or array of string
 * literals, we don't really need a heavy @babel/parse call on the entire source.
 *
 * @returns selfAccepts
 */
function lexAcceptedHmrDeps(code, start, urls) {
  let state = LexerState.inCall
  // the state can only be 2 levels deep so no need for a stack
  let prevState = LexerState.inCall
  let currentDep = ''

  function addDep(index) {
    urls.add({
      url: currentDep,
      start: index - currentDep.length - 1,
      end: index + 1
    })
    currentDep = ''
  }

  for (let i = start; i < code.length; i++) {
    const char = code.charAt(i)
    switch (state) {
      case LexerState.inCall:
      case LexerState.inArray:
        if (char === `'`) {
          prevState = state
          state = LexerState.inSingleQuoteString
        } else if (char === `"`) {
          prevState = state
          state = LexerState.inDoubleQuoteString
        } else if (char === '`') {
          prevState = state
          state = LexerState.inTemplateString
        } else if (/\s/.test(char)) {
          continue
        } else {
          if (state === LexerState.inCall) {
            if (char === `[`) {
              state = LexerState.inArray
            } else {
              // reaching here means the first arg is neither a string literal
              // nor an Array literal (direct callback) or there is no arg
              // in both case this indicates a self-accepting module
              return true // done
            }
          } else if (state === LexerState.inArray) {
            if (char === `]`) {
              return false // done
            } else if (char === ',') {
              continue
            } else {
              error(i)
            }
          }
        }
        break
      case LexerState.inSingleQuoteString:
        if (char === `'`) {
          addDep(i)
          if (prevState === LexerState.inCall) {
            // accept('foo', ...)
            return false
          } else {
            state = prevState
          }
        } else {
          currentDep += char
        }
        break
      case LexerState.inDoubleQuoteString:
        if (char === `"`) {
          addDep(i)
          if (prevState === LexerState.inCall) {
            // accept('foo', ...)
            return false
          } else {
            state = prevState
          }
        } else {
          currentDep += char
        }
        break
      case LexerState.inTemplateString:
        if (char === '`') {
          addDep(i)
          if (prevState === LexerState.inCall) {
            // accept('foo', ...)
            return false
          } else {
            state = prevState
          }
        } else if (char === '$' && code.charAt(i + 1) === '{') {
          error(i)
        } else {
          currentDep += char
        }
        break
      default:
        throw new Error('unknown import.meta.hot lexer state')
    }
  }
  return false
}

function error(pos) {
  const err = new Error(
    `import.meta.accept() can only accept string literals or an ` +
      `Array of string literals.`
  )
  err.pos = pos
  throw err
}

module.exports = {
	lexAcceptedHmrDeps,
	handlePrunedModules,
  handleHMRUpdate,
  debugHmr
}