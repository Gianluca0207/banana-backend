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

  console.log("📥 Dati ricevuti:", { ...req.body, password: '***' }); // Nascondi la password nei log

  try {
    // Validazione input
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required",
        missingFields: {
          name: !name,
          email: !email,
          password: !password,
          phone: !phone
        }
      });
    }

    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid email format" 
      });
    }

    // Validazione password
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "Password must be at least 6 characters long" 
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Verifica se l'email è già presente nel database
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: "Email already registered" 
      });
    }

    const role = (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD)
      ? 'admin'
      : 'user';

    // Imposta il periodo di trial (3 giorni)
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

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

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isTrial: user.isTrial,
      trialEndsAt: user.trialEndsAt,
      isSubscribed: user.isSubscribed,
      token
    });

  } catch (error) {
    console.error("❌ Registration error:", error);

    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: "Email already registered" 
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 📌 LOGIN UTENTE
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email and password are required" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Controllo trial scaduto
    if (user.isTrial && !user.isSubscribed && user.trialEndsAt) {
      const now = new Date();
      if (now > new Date(user.trialEndsAt)) {
        return res.status(403).json({ 
          success: false,
          message: "Your free trial has expired. Please subscribe to continue." 
        });
      }
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isTrial: user.isTrial,
      trialEndsAt: user.trialEndsAt,
      isSubscribed: user.isSubscribed,
      token
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
