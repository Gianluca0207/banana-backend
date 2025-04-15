const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');

// ✅ Leggi le credenziali dalla variabile d'ambiente
const CREDENTIALS = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);

// ✅ Autenticazione
const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

// ✅ Funzione per caricare o aggiornare file su Drive
async function uploadFile(filePath, mimeType, fileName, fileId) {
  const fileMetadata = { name: fileName };
  const media = {
    mimeType,
    body: fs.createReadStream(filePath),
  };

  const res = await drive.files.update({
    fileId,
    media,
    fields: 'id, name',
  });

  return res.data;
}

// ✅ Esportazione corretta
module.exports = { uploadFile };
