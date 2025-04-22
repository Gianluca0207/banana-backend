const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Import crypto for token generation
const nodemailer = require('nodemailer'); // Add nodemailer

// 🔐 Genera JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// 📧 Setup Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'bananatrackapp@gmail.com', // Use from .env or default
    pass: process.env.EMAIL_PASSWORD || 'your_app_password_here' // Replace with actual app password
  }
});

// 📌 REGISTRA UTENTE
const registerUser = async (req, res) => {
  const { name, email, password, phone, deviceId } = req.body;

  console.log("📥 Dati ricevuti:", { ...req.body, password: '***' }); // Nascondi la password nei log

  try {
    // Validazione input
    if (!name || !email || !password || !phone || !deviceId) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required",
        missingFields: {
          name: !name,
          email: !email,
          password: !password,
          phone: !phone,
          deviceId: !deviceId
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
      subscriptionEndDate: null,
      activeDevices: [{
        deviceId,
        lastLogin: now,
        deviceInfo: req.headers['user-agent']
      }]
    });

    await user.save();

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isTrial: user.isTrial,
      trialEndsAt: user.trialEndsAt,
      isSubscribed: user.isSubscribed,
      token,
      deviceInfo: {
        currentDevices: user.activeDevices.length,
        maxDevices: user.maxDevices
      }
    });

  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ 
      success: false,
      message: "An unexpected error occurred. Please try again later.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 📌 LOGIN UTENTE
const loginUser = async (req, res) => {
  const { email, password, deviceId } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        errorType: "missing_fields",
        message: "Please enter both email and password" 
      });
    }

    if (!deviceId) {
      return res.status(400).json({ 
        success: false,
        errorType: "missing_device_id",
        message: "Device ID is required" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        errorType: "invalid_email",
        message: "No account found with this email address" 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        errorType: "invalid_password",
        message: "Incorrect password. Please try again" 
      });
    }

    // Controllo trial scaduto
    if (user.isTrial && !user.isSubscribed && user.trialEndsAt) {
      const now = new Date();
      if (now > new Date(user.trialEndsAt)) {
        return res.status(403).json({ 
          success: false,
          errorType: "trial_expired",
          message: "Your free trial has expired. Please subscribe to continue using the service." 
        });
      }
    }

    // Verifica se il dispositivo è già registrato
    const existingDevice = user.activeDevices.find(d => d.deviceId === deviceId);
    if (existingDevice) {
      existingDevice.lastLogin = new Date();
      await user.save();
    } else if (user.activeDevices.length >= user.maxDevices) {
      return res.status(403).json({ 
        success: false,
        errorType: "device_limit_exceeded",
        message: "You're trying to access from a third device. Maximum 2 devices allowed per account. Please remove a device from your account settings or contact support.",
        currentDevices: user.activeDevices.length,
        maxDevices: user.maxDevices
      });
    } else {
      // Aggiungi il nuovo dispositivo
      user.activeDevices.push({
        deviceId,
        lastLogin: new Date(),
        deviceInfo: req.headers['user-agent']
      });
      await user.save();
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
      token,
      deviceInfo: {
        currentDevices: user.activeDevices.length,
        maxDevices: user.maxDevices
      }
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ 
      success: false,
      errorType: "server_error",
      message: "An unexpected error occurred. Please try again later.",
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

// 📌 RESET PASSWORD
const resetPassword = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }
  
  try {
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    
    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Generate a strong random password that meets requirements
    // At least 8 chars with 1 uppercase, 1 lowercase, 1 number, 1 special character
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_-+=<>?';
    
    // Ensure we have at least one of each required character type
    let newPassword = '';
    newPassword += upperChars.charAt(Math.floor(Math.random() * upperChars.length));
    newPassword += lowerChars.charAt(Math.floor(Math.random() * lowerChars.length));
    newPassword += numbers.charAt(Math.floor(Math.random() * numbers.length));
    newPassword += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
    
    // Add 4 more random characters to reach minimum 8 characters
    const allChars = upperChars + lowerChars + numbers + specialChars;
    for (let i = 0; i < 4; i++) {
      newPassword += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password characters
    newPassword = newPassword.split('').sort(() => 0.5 - Math.random()).join('');
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user's password without triggering middleware
    await User.findByIdAndUpdate(user._id, { password: hashedPassword }, { runValidators: false });
    
    // Send email with the new password
    const mailOptions = {
      from: process.env.EMAIL_USER || 'bananatrackapp@gmail.com',
      to: normalizedEmail,
      subject: 'BananaTrack - Your Password Has Been Reset',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #FFD700; text-align: center;">BananaTrack</h2>
          <p>Hello ${user.name},</p>
          <p>Your password has been reset as requested.</p>
          <p>Your new temporary password is: <strong>${newPassword}</strong></p>
          <p>Please login with this password and change it immediately for security reasons.</p>
          <p style="margin-top: 30px;">Best regards,<br>The BananaTrack Team</p>
        </div>
      `
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email sending error:', error);
        // Still return success even if email fails, as the password was reset
        return res.status(200).json({
          success: true,
          message: "Password reset successful, but email could not be sent"
        });
      }
      
      console.log('Password reset email sent:', info.response);
      res.status(200).json({
        success: true,
        message: "Password reset successful. Check your email for the new password."
      });
    });
    
  } catch (error) {
    console.error("❌ Password reset error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 📌 CAMBIA PASSWORD UTENTE
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Verifica che entrambi i campi siano presenti
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }
    
    // Verifica che la nuova password rispetti i requisiti
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and include uppercase, lowercase, number and special character"
      });
    }
    
    // Recupera l'utente completo con la password (che normalmente è esclusa)
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Verifica che la password corrente sia corretta
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }
    
    // Imposta la nuova password
    user.password = newPassword; // Il middleware pre-save si occuperà dell'hashing
    await user.save();
    
    res.json({
      success: true,
      message: "Password changed successfully"
    });
    
  } catch (error) {
    console.error("❌ Password change error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 📤 ESPORTA TUTTO
module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
  resetPassword,
  changePassword,
};
