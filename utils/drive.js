const authorise = require('./authorise')

const ARCHIVE_ID = '1V0PkGPAkfzZ6Nn3nNOKiNmm8CQM4cn1I'
let drive = null

async function init () { drive = await authorise.drive() }

async function getFilesForArchiving () {
  const res = await drive.files.list({
    q: "name contains '.archive.7z'",
    fields: 'files(id, name, parents, md5Checksum)',
  })

  return res.data.files.filter(file =>
    file.md5Checksum === getHashFromFilename(file.name))
}

function getHashFromFilename (name) {
  const match = /\.([a-f0-9]+)\.archive\.7z/.exec(name)
  return match[1] || ''
}

async function getPathToRoot (file, path = []) {
  path.unshift(file.name)

  if (file.parents) {
    const parent = await getFileFields(file.parents[0],
      'name, id, parents')
    return getPathToRoot(parent, path)
  }

  return path
}

async function getFileFields (fileId, fields) {
  const res = await drive.files.get({ fileId, fields })
  return res.data
}

async function createArchivePath (path) {
  const created = []
  const folders = path.split('/')

  for (let i = 0; i < folders.length; i++) {
    const parentId = i == 0 ? ARCHIVE_ID : created[i - 1]
    const folderId = await getFolderId(parentId, folders[i])

    if (!folderId) {
      const res = await drive.files.create({
        fields: 'id',
        resource: {
          name: folders[i],
          parents: [parentId],
          mimeType: 'application/vnd.google-apps.folder'
        }
      })
      
      created.push(res.data.id)
    } else {
      created.push(folderId)
    }
  }

  return created[created.length - 1]
}

async function getFolderId (parentId, name) {
  const res = await drive.files.list({
    q: `name = '${name}' and '${parentId}' in parents`,
    fields: 'files(id)',
  })

  if (res.data.files.length) return res.data.files[0].id
}

async function moveFileToFolder (file, folderId) {
  const previousParents = file.parents.join(',')

  return drive.files.update({
    fileId: file.id,
    addParents: folderId,
    removeParents: previousParents,
    fields: 'id, parents',
    requestBody: {
      name: renameFile(file.name)
    }
  })
}

function renameFile (name) {
  return name.replace(/\.[a-f0-9]+\.archive/, '')
}

async function removeEmptyFolder (folderId) {
  const deletedFolders = []
  
  const children = await hasChildren(folderId)
  if (!children) {
    const file = await getFileFields(folderId, 'name, id, parents')
    await deleteFile(folderId)
    deletedFolders.push(getPathToRoot(file))
    
    const deletedParents = await removeEmptyFolder(file.parents[0])
    deletedFolders.push(...deletedParents)
  }

  return deletedFolders
}

async function deleteFile (fileId) {
  return drive.files.delete({ fileId })
}

async function hasChildren(folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name)',
  })

  return res.data.files.length > 0
}

module.exports = {
  init,
  getFilesForArchiving,
  getPathToRoot,
  createArchivePath,
  moveFileToFolder,
  removeEmptyFolder
}
