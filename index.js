const drive = require('./utils/drive')
const log = require('./utils/logger')

// Only return paths starting in the `projects` folder and
// ending with a file with `.archive.7z` in the name.
function validatePath (path) {
  return path.indexOf('My Drive/projects') === 0 &&
    path.indexOf('.archive.7z') === path.length - '.archive.7z'.length
}

async function archive () {
  await drive.init()
  
  const files = await drive.getFilesForArchiving()
  
  // Google's APIs freak out if we try to pass too many requests at once.
  // Limit the backup script to a maximum of 5 files in one go to avoid
  // hitting User Rate Limit Exceeded errors. We're in no rush. 
  const sublist = files.slice(0, 5)
  
  const filesWithPaths = await Promise.all(sublist.map(async file => {
    const pathTokens = await drive.getPathToRoot(file)
    const path = pathTokens.join('/')
    const relativePath = pathTokens.slice(2, -1).join('/')
    return { path, relativePath, ...file }
  }))
  
  const validFiles = filesWithPaths.filter(file => validatePath(file.path))
  if (!validFiles.length) return
  
  log.info('Files to be archived:', ...validFiles.map(file => file.path))
  
  const uniquePaths = [...new Set(validFiles.map(file => file.relativePath))]
  const folderIds = {}
  await Promise.all(uniquePaths.map(async path => {
    const id = await drive.createArchivePath(path)
    folderIds[path] = id
  }))

  await Promise.all(validFiles.map(async file => {
    const folderId = folderIds[file.relativePath]
    await drive.moveFileToFolder(file, folderId)
  }))
  log.info('Files successfully archived.')
  
  const checkFolders = [...new Set(validFiles.map(file => file.parents[0]))]
  const deleted = (await Promise.all(
    checkFolders.map(folder => drive.removeEmptyFolder(folder))
  ))

  const deletedPaths = await Promise.all(deleted
    .filter(folders => folders.length)
    .flat()
    .map(async foldersPromise => {
      const folders = await foldersPromise
      return `My Drive/archive/${folders.join('/')}`
    }))
  if (deletedPaths.length) log.info('Folders deleted:', ...deletedPaths)
}

archive().catch(log.error)
