const User = require("../models/User");

const checkTrialOrSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      console.error(`❌ Utente non trovato per ID: ${req.user.id}`);
      return res.status(404).json({ 
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }
    
    const now = new Date();

    // Log per debug
    console.log(`📊 Controllo accesso per: ${user.email}`);
    console.log(`   Sottoscrizione: ${user.isSubscribed ? 'Attiva' : 'Inattiva'}`);
    console.log(`   Trial: ${user.isTrial ? 'Attivo' : 'Inattivo'}`);
    console.log(`   Data fine trial: ${user.trialEndsAt}`);
    console.log(`   Data fine abbonamento: ${user.subscriptionEndDate}`);

    // ✅ Se l'utente ha un abbonamento attivo → passa
    if (user.isSubscribed && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > now) {
      console.log(`✅ Accesso concesso - Abbonamento attivo fino a ${user.subscriptionEndDate}`);
      return next();
    }

    // ✅ Se è ancora nel periodo di prova
    if (user.isTrial && user.trialEndsAt && new Date(user.trialEndsAt) > now) {
      const daysLeft = Math.ceil((new Date(user.trialEndsAt) - now) / (1000 * 60 * 60 * 24));
      req.trialInfo = { daysLeft };
      console.log(`✅ Accesso concesso - Trial attivo, ${daysLeft} giorni rimanenti`);
      return next();
    }

    // ❌ Altrimenti → trial scaduto e non è abbonato
    console.log(`❌ Accesso negato - Trial scaduto e nessun abbonamento attivo`);
    return res.status(403).json({ 
      message: "Trial expired. Please subscribe to continue.",
      code: "TRIAL_EXPIRED",
      trialEndsAt: user.trialEndsAt,
      subscriptionEndDate: user.subscriptionEndDate
    });

  } catch (error) {
    console.error("❌ Errore nel middleware di controllo trial/subscription:", error);
    
    // Errori specifici per problemi comuni
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: "Invalid user ID format",
        code: "INVALID_USER_ID"
      });
    }
    
    // Errore generico
    res.status(500).json({ 
      message: "Server error checking access.", 
      code: "SERVER_ERROR" 
    });
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
