const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require('path');
require('./scheduler');

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
app.use('/data', express.static(path.join(__dirname, 'data')));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

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
  let retries = 5;
  while (retries > 0) {
    try {
      console.log("🔄 Tentativo di connessione a MongoDB...");
      console.log("🔧 Opzioni di connessione:", JSON.stringify(mongoOptions, null, 2));
      
      await mongoose.connect(process.env.MONGO_URI, mongoOptions);
      
      console.log("✅ MongoDB Connesso!");
      console.log("📂 Nome database attivo:", mongoose.connection.name);
      console.log("👥 Pool size attuale:", mongoose.connection.base.connections.length);
      
      // Monitor connection events
      mongoose.connection.on('connected', () => {
        console.log('✅ MongoDB connected');
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB error:', err);
      });

      return;
      
    } catch (error) {
      console.error("❌ Errore nella connessione a MongoDB:", error.message);
      console.error("🔍 Dettagli errore:", error);
      
      retries--;
      if (retries === 0) {
        console.error("❌ Numero massimo di tentativi raggiunto. Server in arresto.");
        process.exit(1);
      }
      
      console.log(`🔄 Tentativo di riconnessione in 5 secondi... (${retries} tentativi rimasti)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
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
app.use("/api/auth", require(path.join(__dirname, "routes/authRoutes"))); // login, register, logout
app.use("/api/users", require(path.join(__dirname, "routes/userRoutes"))); // nuova rotta: /api/users/me
app.use("/api/excel", require(path.join(__dirname, "routes/chartRoutes")));
app.use("/api/subscriptions", require(path.join(__dirname, "routes/subscriptionRoutes")));  // 🔥 Corretta questa linea
app.use("/api/renewals", require(path.join(__dirname, "routes/renewalRoutes"))); // 🔥 Nuova rotta per i rinnovi
app.use("/api/summary", require(path.join(__dirname, "routes/summaryRoutes")));
app.use("/api/exporters", require(path.join(__dirname, "routes/topExporters")));
app.use("/api/fulltopexporters", require(path.join(__dirname, "routes/fullTopExporters")));
app.use("/api/weather", require(path.join(__dirname, "routes/weatherRoutes")));
app.use("/api/payments", require(path.join(__dirname, "routes/paymentRoutes")));
app.use("/api/gdrive", require(path.join(__dirname, "routes/gdriveRoutes")));
app.use('/api/download', require(path.join(__dirname, './routes/downloadRoutes')));
app.use('/api/mongo-summary', require(path.join(__dirname, './routes/mongoSummaryRoutes')));
app.use('/api/mongo-summary-conosur', require(path.join(__dirname, './routes/mongoSummaryConoSurRoutes')));
app.use('/api/forecast', require(path.join(__dirname, './routes/forecastRoutes')));
app.use('/api/enfundas', require(path.join(__dirname, './routes/enfundasRoutes')));

// ✅ Nuova rotta per Exporter Data Cono Sur
app.use("/api/conoSurexporters", require(path.join(__dirname, "./routes/conoSurExportersRoutes")));

// ✅ Nuove rotte protette che richiedono una subscription attiva
app.use("/api/protected", require(path.join(__dirname, "./routes/protectedRoutes")));

// 📂 Cartella per file statici (es. immagini caricate)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 

// Rotta per la dashboard
app.use('/api/dashboard', require(path.join(__dirname, 'routes/dashboardRoutes')));

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 📌 Porta del server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Server in esecuzione sulla porta ${PORT}`));
