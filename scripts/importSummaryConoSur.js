const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');

const SummaryConoSur = require('../models/SummaryConoSur');

mongoose.connect('mongodb+srv://bananatracker:Gp02072001@cluster0.qvz8ays.mongodb.net/bananadatabase?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const filePath = path.join(__dirname, '../data/ESTADISTICAS COM 2025 CONO SUR.xlsx');

async function importData() {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['BASE'];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

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

    await SummaryConoSur.deleteMany();
    await SummaryConoSur.insertMany(formatted);

    console.log(`✅ Importati ${formatted.length} righe da CONO SUR`);
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Errore importazione Cono Sur:', error);
    mongoose.disconnect();
  }
}

importData();
