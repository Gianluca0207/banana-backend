const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const forecastRoutes = require('./routes/forecastRoutes');
const { syncFiles } = require('./services/syncService');

dotenv.config();

const app = express();

// Configurazione CORS
const corsOptions = {
  origin: '*', // In produzione, sostituire con il dominio del frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/data', express.static(require('path').join(__dirname, 'data')));

// Serve static files from public directory
app.use(express.static('public'));

// Rotta base per la root path
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'BananaTrack API is running',
    version: '1.0',
    status: 'online'
  });
});

// MongoDB Connection Options
const mongoOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  minPoolSize: 10,
  retryWrites: true,
  retryReads: true,
  connectTimeoutMS: 30000,
  heartbeatFrequencyMS: 10000,
  maxIdleTimeMS: 60000,
  waitQueueTimeoutMS: 30000,
  family: 4,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

// 📌 Connessione al database MongoDB con retry logic
const connectWithRetry = async () => {
  console.log('🔄 Tentativo di connessione a MongoDB...');
  console.log('🔧 Opzioni di connessione:', JSON.stringify(mongoOptions, null, 2));
  
  try {
    await mongoose.connect(process.env.MONGO_URI, mongoOptions);
    console.log('✅ Connesso a MongoDB con successo!');
    
    // Avvia la sincronizzazione iniziale
    console.log('🔄 Avvio sincronizzazione iniziale...');
    await syncFiles();
    console.log('✅ Sincronizzazione iniziale completata');
  } catch (error) {
    console.error('❌ Errore di connessione a MongoDB:', error);
    setTimeout(connectWithRetry, 5000);
  }
};

// Avvia la connessione con retry
connectWithRetry();

// Gestione errori di connessione MongoDB
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
  if (err.code === 8000) { // AtlasError
    console.error("❌ MongoDB Atlas authentication error. Check your credentials.");
    process.exit(1);
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnesso. Tentativo di riconnessione...');
});

// 📌 Rotte principali
app.use("/api/auth", require("./routes/authRoutes")); // login, register, logout
app.use("/api/users", require("./routes/userRoutes")); // nuova rotta: /api/users/me
app.use("/api/excel", require("./routes/chartRoutes"));
app.use("/api/subscriptions", require("./routes/subscriptionRoutes"));  // 🔥 Corretta questa linea
app.use("/api/renewals", require("./routes/renewalRoutes")); // 🔥 Nuova rotta per i rinnovi
app.use("/api/summary", require("./routes/summaryRoutes"));
app.use("/api/exporters", require("./routes/topExporters"));
app.use("/api/fulltopexporters", require("./routes/fullTopExporters"));
app.use("/api/weather", require("./routes/weatherRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/gdrive", require("./routes/gdriveRoutes"));
app.use('/api/download', require('./routes/downloadRoutes'));
app.use('/api/mongo-summary', require('./routes/mongoSummaryRoutes'));
app.use('/api/mongo-summary-conosur', require('./routes/mongoSummaryConoSurRoutes'));






// ✅ Nuova rotta per Exporter Data Cono Sur
app.use("/api/conoSurexporters", require("./routes/conoSurExportersRoutes"));

// ✅ Nuove rotte protette che richiedono una subscription attiva
app.use("/api/protected", require("./routes/protectedRoutes"));

// 📂 Cartella per file statici (es. immagini caricate)
app.use('/uploads', express.static('uploads')); 

// Import error handling middleware
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Route for forecasts
app.use('/api/forecast', forecastRoutes);

// 404 handler - must be before the error handler
app.use(notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

// 📌 Porta del server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Server in esecuzione sulla porta ${PORT}`));

// Avvia lo scheduler per la sincronizzazione automatica
require('./services/scheduler');
