const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');

// ✅ Leggi le credenziali
const CREDENTIALS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../gdrive-creds.json'), 'utf8')
);

// ✅ Autenticazione
const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

// ✅ Funzione per caricare o aggiornare file su Drive
async function uploadFile(filePath, mimeType, fileName, fileId) {
  // Verifica che il file esista e sia leggibile
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch (error) {
    throw new Error(`Impossibile accedere al file: ${error.message}`);
  }

  // Leggi il file in memoria per evitare problemi con gli stream
  const fileContent = await fs.promises.readFile(filePath);
  
  const fileMetadata = { name: fileName };
  const media = {
    mimeType,
    body: fileContent,
  };

  try {
    console.log(`🔄 Inizio upload di ${fileName} (ID: ${fileId})`);
    
    // Forza l'uso di multipart per upload più affidabile
    const res = await drive.files.update({
      fileId,
      resource: fileMetadata,
      media,
      fields: 'id, name, modifiedTime',
      supportsAllDrives: true,
      // Usa un timeout più lungo per file di grandi dimensioni
      timeout: 120000 // 2 minuti
    });
    
    console.log(`🔄 Upload completato, modificato alle ${res.data.modifiedTime}`);
    return res.data;
  } catch (error) {
    // Gestisci errori specifici dell'API Drive
    if (error.code === 403) {
      throw new Error(`Permessi insufficienti per aggiornare il file: ${error.message}`);
    } else if (error.code === 404) {
      throw new Error(`File non trovato su Drive con ID ${fileId}: ${error.message}`);
    } else {
      throw new Error(`Errore nell'upload del file: ${error.message}`);
    }
  }
}

// ✅ Esportazione corretta
module.exports = { uploadFile };
