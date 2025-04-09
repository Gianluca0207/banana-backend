const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const GRAPHICS_FOLDER = path.join(__dirname, '../data/'); // 📌 Cartella con i file Excel dei grafici

// 📌 Funzione per estrarre i grafici dai file Excel
const extractChartsFromExcel = (fileName) => {
    try {
        const filePath = path.join(GRAPHICS_FOLDER, fileName);

        if (!fs.existsSync(filePath)) {
            console.error(`❌ Il file Excel "${fileName}" non esiste!`);
            return [];
        }

        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();
        
        let charts = [];

        entries.forEach(entry => {
            if (entry.entryName.startsWith('xl/charts/chart')) {
                charts.push(entry.entryName);
            }
        });

        console.log(`✅ Grafici trovati in "${fileName}":`, charts);
        return charts;
    } catch (error) {
        console.error("❌ Errore nell'estrazione dei grafici:", error);
        return [];
    }
};

module.exports = { extractChartsFromExcel };
