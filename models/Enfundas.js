const mongoose = require('mongoose');

const EnfundasSchema = new mongoose.Schema({
  sc: String,      // Prima riga orizzontale
  se: String,      // Seconda riga orizzontale
  year2024: Number,   // Dati 2024
  year2025: Number,   // Dati 2025
  prevision: Number   // PREVISION
});

module.exports = mongoose.model('Enfundas', EnfundasSchema); 