const mongoose = require('mongoose');

const conoSurSchema = new mongoose.Schema({
  week: Number,
  exporter: String,
  consignee: String,
  country: String,
  boxes: Number,
  destino: String,
  buque: String,
  tipo22XU: Number,
  tipo208: Number
}, {
  collection: 'summaryconosur'  // 💥 nome esatto come nel DB
});

module.exports = mongoose.model('ConoSurSummary', conoSurSchema);
