const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

// 📌 Funzione per leggere un file Word
const readWordFile = (fileName) => {
    const filePath = path.join(__dirname, '../data', fileName);  // Percorso del file nella cartella data

    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                reject('Errore nel leggere il file Word');
            }

            // Utilizza mammoth per estrarre il testo dal file Word
            mammoth.extractRawText({ buffer: data })
                .then((result) => {
                    resolve(result.value);  // Restituisce il contenuto del file Word come testo
                })
                .catch((error) => {
                    reject('Errore nell\'estrarre il contenuto del file Word');
                });
        });
    });
};

module.exports = { readWordFile };
