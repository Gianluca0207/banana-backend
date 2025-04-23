const xlsx = require('xlsx');
const path = require('path');
const ExporterPrice = require('../models/ExporterPrice');

// Funzione per convertire numeri Excel in formato Data
const excelDateToJSDate = (serial) => {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
};

// Funzione per leggere dati da Excel (fallback)
const readFromExcel = (boxType) => {
    const filePath = path.join(__dirname, '../data/exporters.xlsx');
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[boxType];
    if (!worksheet) {
        throw new Error("Sheet not found.");
    }
    let jsonData = xlsx.utils.sheet_to_json(worksheet);
    return jsonData.map(item => ({
        weekNumber: item['Week Number'],
        week: excelDateToJSDate(item['Week']),
        price: item['Price'],
        change: item['Change'],
        boxType: boxType
    }));
};

exports.getSheetData = async (req, res) => {
    try {
        const boxType = req.query.sheet;
        if (!boxType) {
            return res.status(400).json({ message: "Specifies the box type (43LB 22XU, 44LB 22XU, 50LB 22XU, 31.5LB Box208)." });
        }

        // Prova a leggere da MongoDB
        try {
            const data = await ExporterPrice.find({ boxType }).sort({ weekNumber: 1 });
            if (data && data.length > 0) {
                console.log("✅ Data retrieved from MongoDB");
                return res.json(data);
            }
        } catch (mongoError) {
            console.log("⚠️ MongoDB read failed, falling back to Excel");
        }

        // Fallback a Excel
        const jsonData = readFromExcel(boxType);
        console.log("✅ Data Converted and Sent to Frontend from Excel");
        res.json(jsonData);
    } catch (error) {
        console.error('❌ Error retrieving sheet data:', error);
        res.status(500).json({ message: "Error retrieving sheet data." });
    }
};

exports.getWeeks = async (req, res) => {
    try {
        const boxType = req.query.sheet;
        if (!boxType) {
            return res.status(400).json({ message: "Specifies the box type (43LB 22XU, 44LB 22XU, 50LB 22XU, 31.5LB Box208)." });
        }

        // Prova a leggere da MongoDB
        try {
            const data = await ExporterPrice.find({ boxType }).distinct('weekNumber');
            if (data && data.length > 0) {
                console.log("✅ Weeks retrieved from MongoDB");
                return res.json(data);
            }
        } catch (mongoError) {
            console.log("⚠️ MongoDB read failed, falling back to Excel");
        }

        // Fallback a Excel
        const jsonData = readFromExcel(boxType);
        const weeks = Array.from(new Set(jsonData.map(item => item.weekNumber)));
        console.log("✅ Weeks Extracted from Excel");
        res.json(weeks);
    } catch (error) {
        console.error('❌ Error retrieving weeks:', error);
        res.status(500).json({ message: "Error retrieving weeks." });
    }
};
