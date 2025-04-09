const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getCurrentUser, updateUserProfile } = require("../controllers/authController");

// Rotta per ottenere i dati dell'utente
router.get("/me", protect, getCurrentUser);

// Rotta per aggiornare il profilo
router.post("/update", protect, updateUserProfile);

module.exports = router;
