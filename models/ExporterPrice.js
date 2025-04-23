const mongoose = require('mongoose');

const exporterPriceSchema = new mongoose.Schema({
    weekNumber: { type: Number, required: true },
    week: { type: Date, required: true },
    price: { type: Number, required: true },
    change: { type: Number, required: true },
    boxType: { type: String, required: true, enum: ['43LB 22XU', '44LB 22XU', '50LB 22XU', '31.5LB Box208'] }
});

module.exports = mongoose.model('ExporterPrice', exporterPriceSchema); 