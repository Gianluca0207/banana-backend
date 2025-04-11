const mongoose = require('mongoose');

const SummaryConoSurSchema = new mongoose.Schema({
  week: Number,
  exporter: String,
  consignee: String,
  country: String,
  boxes: Number,
  destino: String,
  buque: String,
  tipo22XU: Number,
  tipo208: Number
});

module.exports = mongoose.model('SummaryConoSur', SummaryConoSurSchema, 'summaryconosur');
