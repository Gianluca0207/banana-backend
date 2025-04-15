const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Leggi le credenziali dalla variabile d'ambiente
const CREDENTIALS = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

async function uploadFile(localPath, fileName) {
  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  const fileMetadata = { name: fileName };
  const media = {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    body: fs.createReadStream(localPath),
  };

  const res = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, name',
  });

  console.log(`✅ File '${fileName}' caricato! ID: ${res.data.id}`);
}

// ⬇️ Upload dei 3 file richiesti
(async () => {
  await uploadFile(path.join(__dirname, '../data/exporters.xlsx'), 'exporters.xlsx');
  await uploadFile(path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx'), 'ESTADISTICAS_COM_2025.xlsx');
  await uploadFile(path.join(__dirname, '../data/ESTADISTICAS COM 2025 CONO SUR.xlsx'), 'ESTADISTICAS COM 2025 CONO SUR.xlsx');
})();

module.exports = { uploadFile };
