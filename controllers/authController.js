const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Import crypto for token generation

// 🔐 Genera JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// 📌 REGISTRA UTENTE
const registerUser = async (req, res) => {
  const { name, email, password, phone } = req.body;

  console.log("📥 Dati ricevuti:", req.body);
  console.log("🔌 Stato connessione Mongo:", mongoose.connection.readyState); // 1 = connesso

  try {
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();  // Normalizza l'email (minuscolo, senza spazi)
    
    // Verifica se l'email è già presente nel database
    const userExists = await User.findOne({ email: normalizedEmail });

    console.log("🔍 Email già presente?", userExists !== null);  // Log se l'email è duplicata

    if (userExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const role = (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD)
      ? 'admin'
      : 'user';

    // Imposta il periodo di trial (3 giorni)
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);  // 3 giorni di trial

    // ✅ Usa .save() per attivare il middleware che cripta la password
    const user = new User({
      name,
      email: normalizedEmail,
      phone,
      password,
      role,
      isTrial: true,
      trialEndsAt,
      isSubscribed: false,
      subscriptionPlan: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null
    });

    await user.save();
    console.log("🧾 User saved:", user);
    console.log("✅ User created successfully:", user.email);
    const checkUser = await User.findOne({ email: normalizedEmail });
    console.log("🔍 Verifica post-save:", checkUser);

    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isTrial: user.isTrial,
      trialEndsAt: user.trialEndsAt,
      isSubscribed: user.isSubscribed,
      token: generateToken(user.id),
    });

  } catch (error) {
    console.error("❌ Registration error:", error);

    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already registered (duplicate)" });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 📌 LOGIN UTENTE
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ⏳ Controllo trial scaduto
    if (user.isTrial && !user.isSubscribed && user.trialEndsAt) {
      const now = new Date();
      if (now > new Date(user.trialEndsAt)) {
        return res.status(403).json({ message: "Your free trial has expired. Please subscribe to continue." });
      }
    }

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isTrial: user.isTrial,
      trialEndsAt: user.trialEndsAt,
      isSubscribed: user.isSubscribed,
      token: generateToken(user.id),
    });

  } catch (error) {
    console.error("❌ Errore login:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 📌 LOGOUT UTENTE
const logoutUser = (req, res) => {
  res.status(200).json({ message: "Logout successful" });
};

// 📌 DATI UTENTE CORRENTE
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isTrial: user.isTrial,
      trialEndsAt: user.trialEndsAt,
      isSubscribed: user.isSubscribed,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
    });

  } catch (error) {
    console.error("❌ Errore fetch utente:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 📌 AGGIORNA PROFILO UTENTE
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update user fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.phone) user.phone = req.body.phone;
    if (req.body.isSubscribed !== undefined) user.isSubscribed = req.body.isSubscribed;
    if (req.body.subscriptionPlan) user.subscriptionPlan = req.body.subscriptionPlan;
    if (req.body.subscriptionStartDate) user.subscriptionStartDate = req.body.subscriptionStartDate;
    if (req.body.subscriptionEndDate) user.subscriptionEndDate = req.body.subscriptionEndDate;
    
    // Ensure required fields are present
    if (!user.phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    
    await user.save();
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isTrial: user.isTrial,
      trialEndsAt: user.trialEndsAt,
      isSubscribed: user.isSubscribed,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
    });
  } catch (error) {
    console.error("❌ Errore aggiornamento profilo:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 📤 ESPORTA TUTTO
module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
};
