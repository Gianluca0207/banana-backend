const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

// 📌 Rotte per Registrazione, Login, Logout
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

// 📌 Ritorna info dell'utente autenticato
router.get("/me", protect, getCurrentUser);

// 📌 Aggiorna profilo utente
router.put("/profile", protect, updateUserProfile);

module.exports = router;
