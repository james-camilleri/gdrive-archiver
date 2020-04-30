const fs = require('fs').promises
const readline = require('readline')
const nodemailer = require('nodemailer')
const { google } = require('googleapis')

const EMAIL_CREDENTIALS = './credentials/email.json'
const DRIVE_CREDENTIALS = './credentials/google-drive.json'
const TOKEN_PATH = './credentials/token.json'

const SCOPES = ['https://www.googleapis.com/auth/drive']


async function getDrive () {
  const auth = await getDriveClient()
  return google.drive({ version: 'v3', auth })
}

async function getDriveClient() {
  const credentials = await fs.readFile(DRIVE_CREDENTIALS)

  const {
    client_secret,
    client_id,
    redirect_uris
  } = JSON.parse(credentials).installed

  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0])

  // Check if we have previously stored a token.
  try {
    const token = await fs.readFile(TOKEN_PATH, 'utf-8')
    oAuth2Client.setCredentials(JSON.parse(token))
    return  oAuth2Client
  } catch {
    return getAccessToken(oAuth2Client)
  }
}

async function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  })

  console.log('Authorise this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question('Enter the code from that page here: ', async code => {
      rl.close()
  
      const { tokens } = await oAuth2Client.getToken(code)
      oAuth2Client.setCredentials(tokens)
      fs.writeFile(TOKEN_PATH, JSON.stringify(tokens))
  
      resolve(oAuth2Client)
    })
  }) 
}

async function getEmailTransport () {
  const credentials = await fs.readFile(EMAIL_CREDENTIALS, 'utf-8')
  return nodemailer.createTransport(JSON.parse(credentials))
}

module.exports = {
  drive: getDrive,
  emailTransport: getEmailTransport
}