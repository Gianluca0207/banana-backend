const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const drive = google.drive('v3');

// Configurazione delle cartelle e file da sincronizzare
const FILES_TO_SYNC = [
  {
    folderId: '1M7aq8pWKVmW28URMlp1PwQ87-ar05_iN',
    fileName: 'exporters.xlsx',
    localPath: path.join(__dirname, '../data/exporters.xlsx')
  },
  {
    folderId: '1bpXUyk1MlB3Zsx4Z6SBXZzr3efJfeDcy',
    fileName: 'ESTADISTICAS_COM_2025.xlsx',
    localPath: path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx')
  },
  {
    folderId: '1YY1eN8TYDDINZ-rFOFbjFUZ9urfv2Nxj',
    fileName: 'ESTADISTICAS COM 2025 CONO SUR.xlsx',
    localPath: path.join(__dirname, '../data/ESTADISTICAS COM 2025 CONO SUR.xlsx')
  }
];

// Cache per tenere traccia dell'ultima modifica
const lastModifiedCache = new Map();

// Funzione per ottenere l'ultima modifica di un file su Google Drive
async function getLastModifiedTime(folderId, fileName) {
  const authClient = await auth.getClient();
  
  const response = await drive.files.list({
    auth: authClient,
    q: `'${folderId}' in parents and name='${fileName}'`,
    fields: 'files(modifiedTime)',
    pageSize: 1
  });

  const files = response.data.files;
  if (!files || files.length === 0) {
    throw new Error(`File ${fileName} non trovato nella cartella`);
  }

  return new Date(files[0].modifiedTime);
}

// Funzione per scaricare un file da Google Drive
async function downloadFile(folderId, fileName, localPath) {
  const authClient = await auth.getClient();
  
  const response = await drive.files.list({
    auth: authClient,
    q: `'${folderId}' in parents and name='${fileName}'`,
    fields: 'files(id)',
    pageSize: 1
  });

  const files = response.data.files;
  if (!files || files.length === 0) {
    throw new Error(`File ${fileName} non trovato nella cartella`);
  }

  const fileId = files[0].id;
  const res = await drive.files.get({
    auth: authClient,
    fileId: fileId,
    alt: 'media'
  }, { responseType: 'stream' });

  const chunks = [];
  await new Promise((resolve, reject) => {
    res.data.on('data', chunk => chunks.push(chunk));
    res.data.on('end', resolve);
    res.data.on('error', reject);
  });

  const buffer = Buffer.concat(chunks);
  fs.writeFileSync(localPath, buffer);
  console.log(`✅ File ${fileName} scaricato con successo`);
}

// Funzione principale di sincronizzazione
async function syncFiles() {
  console.log('🔄 Inizio sincronizzazione automatica...');
  
  for (const file of FILES_TO_SYNC) {
    try {
      // Ottieni l'ultima modifica del file su Google Drive
      const lastModified = await getLastModifiedTime(file.folderId, file.fileName);
      
      // Se il file non è in cache o è stato modificato
      if (!lastModifiedCache.has(file.fileName) || 
          lastModified > lastModifiedCache.get(file.fileName)) {
        
        console.log(`📥 File ${file.fileName} modificato, scaricamento in corso...`);
        await downloadFile(file.folderId, file.fileName, file.localPath);
        lastModifiedCache.set(file.fileName, lastModified);
      } else {
        console.log(`⏭️ File ${file.fileName} non modificato, skip`);
      }
    } catch (error) {
      console.error(`❌ Errore durante la sincronizzazione di ${file.fileName}:`, error);
    }
  }
  
  console.log('✅ Sincronizzazione completata');
}

// Inizializza l'autenticazione
let auth;
try {
  const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
} catch (error) {
  console.error('❌ Errore nell\'inizializzazione dell\'autenticazione:', error);
}

module.exports = {
  syncFiles
}; 