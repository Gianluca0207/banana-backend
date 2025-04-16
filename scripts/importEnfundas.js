const xlsx = require('xlsx');
const path = require('path');
const mongoose = require('mongoose');
const Enfundas = require('../models/Enfundas');

const filePath = path.join(__dirname, '../data/Enfundas.xlsx');

async function importEnfundasData() {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Grafico'];
    const data = xlsx.utils.sheet_to_json(sheet);

    const formatted = data.map(row => ({
      label: row.LABEL,
      average: row['AVERAGE 2015-2024'],
      year2024: row['2024'],
      year2025: row['2025'],
      prevision: row.PREVISION
    }));

    await Enfundas.deleteMany({});
    await Enfundas.insertMany(formatted);

    console.log(`✅ Importati ${formatted.length} righe da Enfundas.xlsx`);
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Errore durante l\'importazione Enfundas:', error);
    mongoose.disconnect();
  }
}

importEnfundasData(); 