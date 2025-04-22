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

const { protect } = require("../middleware/authMiddleware");

// 📌 Rotte per Registrazione, Login, Logout
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/reset-password", resetPassword);

// 📌 Ritorna info dell'utente autenticato
router.get("/me", protect, getCurrentUser);

// 📌 Aggiorna profilo utente
router.put("/profile", protect, updateUserProfile);

// 📌 Cambio password (richiede autenticazione)
router.post("/change-password", protect, changePassword);

module.exports = router;
