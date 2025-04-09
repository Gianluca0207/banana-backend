const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '../uploads/forecast.png');
const outputPath = path.join(__dirname, '../data/forecastBase64.json');

try {
  const image = fs.readFileSync(sourcePath, { encoding: 'base64' });
  const base64Image = `data:image/png;base64,${image}`;
  const output = { imageBase64: base64Image };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log('✅ forecastBase64.json generato con successo!');
} catch (err) {
  console.error('❌ Errore durante la conversione in Base64:', err.message);
}
