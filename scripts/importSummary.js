const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const SummaryExporter = require('../models/SummaryExporter');

// 📌 Modifica qui con le tue credenziali MongoDB Atlas
mongoose.connect('mongodb+srv://bananatracker:Gp02072001@cluster0.qvz8ays.mongodb.net/bananadatabase?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  

const filePath = path.join(__dirname, '../data/ESTADISTICAS_COM_2025.xlsx');

async function importSummaryData() {
  try {
    const workbook = xlsx.readFile(filePath);
    console.log('📄 Nomi dei fogli presenti:', workbook.SheetNames);

    const sheet = workbook.Sheets['BASE '];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    console.log('📊 Righe lette da Excel:', data.length);
console.log('🔍 Prime 2 righe:', data.slice(0, 2));


    const headerKeys = Object.keys(data[0] || {});
    const destinoKey = headerKeys.find(k => k.toLowerCase().trim() === 'destino') || 'DESTINO';

    const formatted = data.map(row => ({
        week: row.WK,
        exporter: row.EXPORTADORES,
        consignee: row.CONSIGNATARIO,
        country: row.PAIS,
        boxes: row["TOTAL GENERAL"],
        destino: row[destinoKey] || 'Unknown Port',
        buque: row.BUQUES || '',
        tipo22XU: row['22XU'] || 0,
        tipo208: row['208'] || 0,
      })).filter(item =>
        item.week != null &&
        item.exporter?.toString().trim() !== '' &&
        item.country?.toString().trim() !== '' &&
        item.boxes != null
      );
      

    // 🔄 (Opzionale) Cancella i dati precedenti
    await SummaryExporter.deleteMany({});
    await SummaryExporter.insertMany(formatted);

    console.log(`✅ Importati ${formatted.length} righe da ESTADISTICAS_COM_2025.xlsx`);
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Errore durante l\'importazione summary:', error);
    mongoose.disconnect();
  }
}

importSummaryData();
