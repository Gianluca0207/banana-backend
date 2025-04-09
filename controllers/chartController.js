// controllers/chartController.js

exports.getCharts = (req, res) => {
    res.json({ message: "✅ ChartController working!" });
};

exports.getSheetNames = (req, res) => {
    res.json({ message: "✅ getSheetNames working!" });
};
