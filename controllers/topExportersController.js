const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '../data/TopExporters.xlsx');
let cachedData = [];

// 🔁 Funzione per caricare i dati aggiornati
function loadTopExporters() {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Data'];
    const json = xlsx.utils.sheet_to_json(sheet);

    const cleanedData = json.map(row => ({
      week: row['Week'],
      country: row['Country'],
      exporter: row['Exporter'],
      consignee: row['Consignee'],
      boxes: Number(row['Boxes']) || 0,
    })).filter(entry =>
      entry.week !== undefined &&
      entry.country &&
      entry.exporter &&
      entry.consignee
    );

    cachedData = cleanedData;
    console.log('✅ Top Exporters data updated from Excel');
  } catch (error) {
    console.error('❌ Error reading TopExporters Excel:', error);
  }
}

// 🟡 Carica subito all’avvio
loadTopExporters();

// 👀 Ricarica automaticamente se il file viene modificato
fs.watchFile(filePath, () => {
  console.log('🔄 File TopExporters.xlsx modificato. Ricarico...');
  loadTopExporters();
});

// ✅ Controller per l’endpoint
const getTopExporters = (req, res) => {
  res.json({ topExporters: cachedData });
};

module.exports = { getTopExporters };
