// fixEmailIndex.js

const mongoose = require('mongoose');
require('dotenv').config(); // Assicurati di avere il file .env con la URI

// 🔧 URL del tuo database (usa quello nel tuo .env)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bananaDB';

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connesso a MongoDB');

    const db = mongoose.connection.db;

    const indexes = await db.collection('users').indexes();
    console.log('📜 Indici esistenti:', indexes);

    const hasEmailIndex = indexes.some(index => index.key.email && index.name === 'email_1');

    if (hasEmailIndex) {
      console.log('⚠️ Trovato indice unico su email, lo elimino...');
      await db.collection('users').dropIndex('email_1');
      console.log('🧹 Indice eliminato.');
    } else {
      console.log('✅ Nessun indice duplicato da eliminare.');
    }

    console.log('🔁 Ricreo indice unico su email...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('✅ Indice ricreato con successo!');

    process.exit();
  } catch (error) {
    console.error('❌ Errore durante la gestione degli indici:', error);
    process.exit(1);
  }
};

run();
