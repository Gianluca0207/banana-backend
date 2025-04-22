const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const SummaryExporter = require('../models/SummaryExporter');

mongoose.connect('mongodb+srv://bananatracker:Gp02072001@cluster0.qvz8ays.mongodb.net/bananadatabase?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 30000, // 30 secondi
  socketTimeoutMS: 45000,  // 45 secondi
});

const filePath = path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx');

async function importSummaryData() {
  try {
    const workbook = xlsx.readFile(filePath);
    console.log('📄 Nomi dei fogli presenti:', workbook.SheetNames);

    const sheetName = workbook.SheetNames.find(name => name.trim().toLowerCase() === 'base');
    if (!sheetName) {
      throw new Error("❌ Foglio 'BASE' non trovato nel file Excel.");
    }

    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    console.log('📊 Righe lette da Excel:', data.length);
    console.log('🔍 Prime 2 righe:', data.slice(0, 2));

    const headerKeys = Object.keys(data[0] || {});
    console.log('🔑 Colonne disponibili:', headerKeys);

    const formatted = data.map(row => {
      let buque = '';
      if (row.BUQUES && row.BUQUES.includes('BUQUE:')) {
        buque = row.BUQUES.split('BUQUE:')[1].trim();
      }

      return {
        week: row.WK,
        exporter: row.EXPORTADORES?.toString().trim(),
        consignee: row.CONSIGNATARIO?.toString().trim(),
        country: row.PAIS?.toString().trim(),
        boxes: Number(row["TOTAL GENERAL"]) || 0,
        destino: row.DESTINO?.toString().trim() || 'Unknown Port',
        buque: buque,
        tipo22XU: Number(row['22XU']) || 0,
        tipo208: Number(row['208']) || 0,
      };
    }).filter(item =>
      item.week != null &&
      item.exporter &&
      item.country &&
      item.boxes != null
    );

    console.log('✅ Dati formattati:', formatted.length);
    console.log('🔍 Esempio dati formattati:', formatted[0]);

    await SummaryExporter.deleteMany({});
    console.log('🗑️ Vecchi dati eliminati');

    const result = await SummaryExporter.insertMany(formatted);
    console.log(`✅ Importati ${result.length} righe nel database`);

    const count = await SummaryExporter.countDocuments();
    console.log(`📊 Totale documenti nel database: ${count}`);

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Errore durante l\'importazione summary:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

importSummaryData();
