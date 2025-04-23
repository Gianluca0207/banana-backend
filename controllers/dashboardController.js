const xlsx = require('xlsx');
const path = require('path');

// Funzione per convertire numeri Excel in formato Data
const excelDateToJSDate = (serial) => {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
};

// Calcola le medie settimanali
const calculateWeeklyAverages = (data) => {
    const weeklyDataMap = {};
    const weeklyAverages = [];
    
    data.forEach(item => {
        if (!weeklyDataMap[item.WeekNumber]) {
            weeklyDataMap[item.WeekNumber] = { total: 0, count: 0 };
        }
        weeklyDataMap[item.WeekNumber].total += item.Price;
        weeklyDataMap[item.WeekNumber].count += 1;
    });

    let previousAverage = 0;
    Object.keys(weeklyDataMap).sort((a, b) => Number(a) - Number(b)).forEach(weekNumber => {
        const { total, count } = weeklyDataMap[weekNumber];
        const average = total / count;
        weeklyAverages.push({
            WeekNumber: Number(weekNumber),
            Price: average,
            Change: average - previousAverage,
            Week: ''
        });
        previousAverage = average;
    });

    return weeklyAverages;
};

// Filtra e calcola i dati per una settimana specifica
const filterAndCalculateWeekData = (data, week) => {
    const filtered = data.filter(item => String(item.WeekNumber) === week);
    
    if (filtered.length === 0) {
        return {
            currentPrice: 0,
            previousPrice: 0,
            maxPrice: 0,
            minPrice: 0,
            filteredData: []
        };
    }

    const prices = filtered.map(item => item.Price);
    const currentPrice = prices[prices.length - 1];
    const previousPrice = prices.length > 1 ? prices[prices.length - 2] : 0;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);

    return {
        currentPrice,
        previousPrice,
        maxPrice,
        minPrice,
        filteredData: filtered
    };
};

// Controller principale
exports.getDashboardData = async (req, res) => {
    try {
        const { sheet, week } = req.query;
        
        if (!sheet) {
            return res.status(400).json({ message: "Specificare il nome del foglio (BoxType)." });
        }

        // Leggi il file Excel
        const filePath = path.join(__dirname, '../data/exporters.xlsx');
        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets[sheet];

        if (!worksheet) {
            return res.status(404).json({ message: "Foglio non trovato." });
        }

        // Converti i dati
        let jsonData = xlsx.utils.sheet_to_json(worksheet);
        jsonData = jsonData.map(item => {
            if (item['Week'] && typeof item['Week'] === 'number') {
                const date = excelDateToJSDate(item['Week']);
                item['Week'] = date.toISOString().split('T')[0];
            }
            return item;
        });

        // Normalizza i dati
        const normalizedData = jsonData.map(item => ({
            Week: item.Week ? String(item.Week).split('T')[0] : 'Unknown',
            WeekNumber: Number(item["Week Number"] || 0),
            Price: Number(item.Price || 0),
            Change: Number(item.Change || 0)
        }));

        // Calcola le medie settimanali
        const weeklyAverages = calculateWeeklyAverages(normalizedData);

        // Se è specificata una settimana, filtra e calcola i dati
        let weekData = {};
        if (week) {
            weekData = filterAndCalculateWeekData(normalizedData, week);
        }

        // Prepara la risposta
        const response = {
            priceCard: {
                currentPrice: weekData.currentPrice || 0,
                previousPrice: weekData.previousPrice || 0,
                maxPrice: weekData.maxPrice || 0,
                minPrice: weekData.minPrice || 0
            },
            chartData: weekData.filteredData || [],
            weeklyAverages,
            allData: normalizedData
        };

        console.log(`✅ Dati dashboard calcolati per il foglio ${sheet}${week ? `, settimana ${week}` : ''}`);
        res.json(response);
    } catch (error) {
        console.error('❌ Errore nel calcolo dei dati dashboard:', error);
        res.status(500).json({ message: "Errore nel calcolo dei dati dashboard." });
    }
}; 