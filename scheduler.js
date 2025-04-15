const cron = require('node-cron');
const { syncAll } = require('./services/syncService');

// Esegue la sincronizzazione ogni 5 minuti
cron.schedule('*/5 * * * *', async () => {
  console.log('\n⏰ Esecuzione sincronizzazione programmata...');
  try {
    await syncAll();
  } catch (error) {
    console.error('❌ Errore nella sincronizzazione programmata:', error);
  }
});

// Esegue la sincronizzazione all'avvio
console.log('🚀 Scheduler avviato. Prima sincronizzazione in corso...');
syncAll().catch(error => {
  console.error('❌ Errore nella sincronizzazione iniziale:', error);
}); 