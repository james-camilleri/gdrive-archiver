const fs = require('fs').promises
const authorise = require('./authorise')

async function emailError (error) {
  const emailTransport = await authorise.emailTransport()

  const message = {
    from: 'Logs <logs@james.com.mt>',
    to: 'james@james.com.mt',
    subject: `❗ [Error] Google Drive Archiver: "${error.toString()}"`,
    text: `${timestamp()} "${error.toString()}"\n${error.stack}`
  }

  emailTransport.sendMail(message, err => {
    if (err) {
      logToFile('./main.log', `${timestamp()} ERROR: ${err}`)
      logToFile('./error.log', `${timestamp()} ERROR: ${err}\n`)
    }
  })
}

function logToFile (file, log) {
  fs.appendFile(file, `${log}\n`)
}

function timestamp () {
  const dateObject = new Date()

  const year = dateObject.getUTCFullYear()
  const month = ('0' + (dateObject.getUTCMonth() + 1)).slice(-2)
  const date = ('0' + dateObject.getUTCDate()).slice(-2)
  const hours = ('0' + dateObject.getUTCHours()).slice(-2)
  const minutes = ('0' + dateObject.getUTCMinutes()).slice(-2)

  return `[${year}-${month}-${date} ${hours}:${minutes}]`
}

function info (message, ...args) {
  const space = '                          '
  const lines = args.map(line => `\n${space}${line}`).join('')
  const log = `${timestamp()} INFO:  ${message}${lines}`

  console.log(log)
  logToFile('./main.log', log)
}

function error (error) {
  const log = `${timestamp()} ERROR: `

  console.log(log)
  console.log(error)
  
  logToFile('./main.log', `${log}${error.toString()}`),
  logToFile('./error.log', `${log}${error.toString()}\n${error.stack}\n`)

  emailError(error)
}

module.exports = { info, error }
