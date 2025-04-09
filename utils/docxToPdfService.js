// backend/utils/docxToPdfService.js
const { exec } = require('child_process');
const path = require('path');

function convertDocxToPdf(inputFilePath, outputFolder) {
  return new Promise((resolve, reject) => {
    // Costruisci il comando per LibreOffice
    // Nota: assicurati che "libreoffice" sia nel PATH del sistema.
    const cmd = `libreoffice --headless --convert-to pdf --outdir "${outputFolder}" "${inputFilePath}"`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Errore nella conversione:', error);
        return reject(error);
      }
      // Costruisci il percorso del file PDF convertito
      const pdfFileName = path.basename(inputFilePath, path.extname(inputFilePath)) + '.pdf';
      const pdfPath = path.join(outputFolder, pdfFileName);
      resolve(pdfPath);
    });
  });
}

module.exports = { convertDocxToPdf };
