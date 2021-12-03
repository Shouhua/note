const fs = require('fs')
const { join, dirname } = require('path')
const { isFileReadable } = require('../utils')

// https://github.com/vitejs/vite/issues/2820#issuecomment-812495079
const ROOT_FILES = [
  // '.git',

  // https://pnpm.js.org/workspaces/
  'pnpm-workspace.yaml'

  // https://rushjs.io/pages/advanced/config_files/
  // 'rush.json',

  // https://nx.dev/latest/react/getting-started/nx-setup
  // 'workspace.json',
  // 'nx.json'
]

// npm: https://docs.npmjs.com/cli/v7/using-npm/workspaces#installing-workspaces
// yarn: https://classic.yarnpkg.com/en/docs/workspaces/#toc-how-to-use-it
function hasWorkspacePackageJSON(root) {
  const path = join(root, 'package.json')
  if (!isFileReadable(path)) {
    return false
  }
  const content = JSON.parse(fs.readFileSync(path, 'utf-8')) || {}
  return !!content.workspaces
}

function hasRootFile(root) {
  return ROOT_FILES.some((file) => fs.existsSync(join(root, file)))
}

function hasPackageJSON(root) {
  const path = join(root, 'package.json')
  return fs.existsSync(path)
}

/**
 * Search up for the nearest `package.json`
 */
function searchForPackageRoot(current, root = current) {
  if (hasPackageJSON(current)) return current

  const dir = dirname(current)
  // reach the fs root
  if (!dir || dir === current) return root

  return searchForPackageRoot(dir, root)
}

/**
 * Search up for the nearest workspace root
 */
function searchForWorkspaceRoot(
  current,
  root = searchForPackageRoot(current)
) {
  if (hasRootFile(current)) return current
  if (hasWorkspacePackageJSON(current)) return current

  const dir = dirname(current)
  // reach the fs root
  if (!dir || dir === current) return root

  return searchForWorkspaceRoot(dir, root)
}

module.exports = {
	searchForWorkspaceRoot
}