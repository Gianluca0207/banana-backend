const User = require("../models/User");

const checkTrialOrSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const now = new Date();

    // ✅ Se l'utente ha un abbonamento attivo → passa
    if (user.isSubscribed && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > now) {
      return next();
    }

    // ✅ Se è ancora nel periodo di prova
    if (user.isTrial) {
      // Se non c'è una data di fine trial, considera il trial come attivo
      if (!user.trialEndsAt) {
        req.trialInfo = { daysLeft: null };
        return next();
      }

      const trialEnd = new Date(user.trialEndsAt);
      if (trialEnd > now) {
        const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        req.trialInfo = { daysLeft };
        return next();
      }
    }

    // ❌ Altrimenti → trial scaduto e non è abbonato
    return res.status(403).json({ 
      message: "Trial expired. Please subscribe to continue.",
      code: "TRIAL_EXPIRED",
      trialEndsAt: user.trialEndsAt,
      subscriptionEndDate: user.subscriptionEndDate
    });

  } catch (error) {
    console.error("Errore nel middleware di controllo trial/subscription:", error);
    res.status(500).json({ message: "Errore del server nel controllo accesso." });
  }
};

// Middleware per il rinnovo che permette il passaggio se l'utente esiste
const allowRenewal = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return next();
  } catch (error) {
    console.error("Error in renewal middleware:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { checkTrialOrSubscription, allowRenewal };
