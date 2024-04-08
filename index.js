const fsPromises = require('fs').promises
const fs = require('fs')
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const { log, timeStamp } = require('console');

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive'
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const fileId = "1Lc4yx3y74Zr70fm18_CLxV_HL13AVaXSXC5K3x8k4Lo"

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fsPromises.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fsPromises.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fsPromises.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Downloads a file
 * @param{string} realFileId file ID
 * @return{obj} file status
 * */
async function downloadFile(authClient, versionTimeStamp) {
  const drive = google.drive({ version: 'v3', auth: authClient })
  const dest = fs.createWriteStream('input/Inventario.xlsx');

  try {
    drive.files.export({
      fileId: fileId,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }, {
      responseType: 'stream'
    }, function (err, response) {
      if (err) return console.error(err);
      response.data.on('end', () => { }
      )
        .pipe(dest);
    });

    return 'input/Inventario.xlsx'
  } catch (err) {

    throw err;
  }
}

async function cloudVersionTimestamp(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  const fileDetails = await drive.files.get({
    fileId: fileId,
    fields: 'modifiedTime',

  })
  const cloudVersionTimestamp = fileDetails.data.modifiedTime

  return cloudVersionTimestamp
}

function isUpdateNecessary(cloudVersionTimestamp) {
  const localVersionTimestamp = JSON.parse(fs.readFileSync('input/metadata.json')).modifiedTime
  const result = cloudVersionTimestamp !== localVersionTimestamp
  if (result) {
    console.log("It is necessary to update the file!")
    return result
  } else {
    console.log("There's no need to update the file");
    return result
  }
}

async function downloadFileIfNeccesary(authClient) {
  let pathToMostRecentVersion = ""
  const cloudTimeStamp = await cloudVersionTimestamp(authClient)
  if (isUpdateNecessary(cloudTimeStamp)) {
    console.log("File download started")
    pathToMostRecentVersion = await downloadFile(authClient)
    fs.writeFileSync('input/metadata.json', JSON.stringify({ modifiedTime: cloudTimeStamp }), 'utf8');
  } else {
    pathToMostRecentVersion = 'input/Inventario.xlsx'
  } 

  return pathToMostRecentVersion
}

async function mostRecentVersion() {
  try {
    const authClient = await authorize();
    const pathToCorrectVersion = await downloadFileIfNeccesary(authClient);

    return pathToCorrectVersion
  } catch (error) {
    console.error(error);

    throw error; // Rethrow the error for further handling
  }
}

mostRecentVersion();
