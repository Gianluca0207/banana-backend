const cron = require('node-cron');
const { syncFiles } = require('./syncService');

// Sincronizza i file ogni 5 minuti
cron.schedule('*/5 * * * *', async () => {
  try {
    await syncFiles();
  } catch (error) {
    console.error('❌ Errore durante la sincronizzazione automatica:', error);
  }
});

console.log('⏰ Scheduler avviato: sincronizzazione ogni 5 minuti'); 