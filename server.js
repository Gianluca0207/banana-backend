const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const forecastRoutes = require('./routes/forecastRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 📌 Connessione al database MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connesso!");
    console.log("📂 Nome database attivo:", mongoose.connection.name);
  })
  .catch((error) => console.error("❌ Errore nella connessione a MongoDB:", error.message));

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
app.use("/api/forecast", forecastRoutes);

// ✅ Nuova rotta per Exporter Data Cono Sur
app.use("/api/conoSurexporters", require("./routes/conoSurExportersRoutes"));

// ✅ Nuove rotte protette che richiedono una subscription attiva
app.use("/api/protected", require("./routes/protectedRoutes"));

// 📂 Cartella per file statici (es. immagini caricate)
app.use('/uploads', express.static('uploads')); 

// 📌 Porta del server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Server in esecuzione sulla porta ${PORT}`));
