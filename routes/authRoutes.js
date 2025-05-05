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
  refreshToken,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");

// 📌 Rotte per Registrazione, Login, Logout
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", protect, refreshToken);

// 📌 Ritorna info dell'utente autenticato
router.get("/me", protect, getCurrentUser);

// 📌 Aggiorna profilo utente
router.put("/profile", protect, updateUserProfile);

// 📌 Cambio password (richiede autenticazione)
router.post("/change-password", protect, changePassword);

// 📌 Gestione dispositivi
router.get("/devices", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      devices: user.activeDevices,
      maxDevices: user.maxDevices
    });
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching devices" 
    });
  }
});

router.post("/devices/remove", protect, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!deviceId) {
      return res.status(400).json({ 
        success: false,
        message: "Device ID is required" 
      });
    }

    const deviceIndex = user.activeDevices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: "Device not found" 
      });
    }

    user.activeDevices.splice(deviceIndex, 1);
    await user.save();
    
    res.json({ 
      success: true,
      message: "Device removed successfully",
      remainingDevices: user.activeDevices.length
    });
  } catch (error) {
    console.error("Error removing device:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while removing device" 
    });
  }
});

module.exports = router;
