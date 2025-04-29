const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getCurrentUser, updateUserProfile, changePassword, deleteAccount } = require("../controllers/authController");

// Rotta per ottenere i dati dell'utente
router.get("/me", protect, getCurrentUser);

// Rotta per aggiornare il profilo
router.post("/update", protect, updateUserProfile);

// Rotta per cambiare la password
router.post("/change-password", protect, changePassword);

// Rotta per cancellare l'account
router.delete("/account", protect, deleteAccount);

module.exports = router;
