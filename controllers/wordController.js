// backend/controllers/wordController.js
const path = require('path');
const { convertDocxToPdf } = require('../utils/docxToPdfService');

async function getWordAsPdf(req, res) {
  try {
    const { fileName } = req.params; // ad esempio "informazioni.docx"
    // Costruisci il percorso del file DOCX nella cartella data
    const docxPath = path.join(__dirname, '..', 'data', fileName);
    
    // Definisci la cartella di output (può essere la stessa cartella "data" o una dedicata)
    const outputFolder = path.join(__dirname, '..', 'data');
    
    // Esegui la conversione
    const pdfPath = await convertDocxToPdf(docxPath, outputFolder);
    
    // Invia il file PDF al client
    res.sendFile(pdfPath);
  } catch (error) {
    console.error('Errore nella conversione DOCX->PDF:', error);
    res.status(500).json({ message: 'Errore nella conversione del file Word in PDF' });
  }
}

module.exports = { getWordAsPdf };
