const { google } = require('googleapis');
const { Readable } = require('stream');
const xlsx = require('xlsx');

const drive = google.drive('v3');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

async function getLatestExcelFileFromFolder(folderId) {
  const authClient = await auth.getClient();

  const response = await drive.files.list({
    auth: authClient,
    q: `'${folderId}' in parents and mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`,
    orderBy: 'modifiedTime desc',
    fields: 'files(id, name, modifiedTime)',
    pageSize: 1,
  });

  const files = response.data.files;
  if (!files || files.length === 0) {
    throw new Error('❌ Nessun file Excel trovato nella cartella Drive');
  }

  const file = files[0];

  const res = await drive.files.get({
    auth: authClient,
    fileId: file.id,
    alt: 'media',
  }, { responseType: 'stream' });

  const chunks = [];
  await new Promise((resolve, reject) => {
    res.data.on('data', (chunk) => chunks.push(chunk));
    res.data.on('end', resolve);
    res.data.on('error', reject);
  });

  const buffer = Buffer.concat(chunks);
  const workbook = xlsx.read(buffer, { type: 'buffer' });

  return workbook;
}

module.exports = {
  getLatestExcelFileFromFolder,
};
