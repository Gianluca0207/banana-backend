const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
  resetPassword,
  changePassword,
} = require("../controllers/authController");
const User = require("../models/User");

const { protect } = require("../middleware/authMiddleware");

// 📌 Rotte per Registrazione, Login, Logout
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/reset-password", resetPassword);

// Nuovo endpoint per forzare il logout da tutti i dispositivi
router.post("/force-logout", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }
    
    // Trova l'utente tramite email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    // Rimuovi il deviceToken
    user.deviceToken = null;
    await user.save();
    
    res.status(200).json({ 
      success: true, 
      message: "Logout successful from all devices" 
    });
  } catch (error) {
    console.error("❌ Force logout error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📌 Ritorna info dell'utente autenticato
router.get("/me", protect, getCurrentUser);

// 📌 Aggiorna profilo utente
router.put("/profile", protect, updateUserProfile);

// 📌 Cambio password (richiede autenticazione)
router.post("/change-password", protect, changePassword);

module.exports = router;
