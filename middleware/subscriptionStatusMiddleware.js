const User = require("../models/User");

const subscriptionStatusMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const now = new Date();

    // Se l'utente ha un abbonamento attivo → passa
    if (user.isSubscribed && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > now) {
      return next();
    }

    // Se è ancora nel periodo di prova
    if (user.isTrial && user.trialEndsAt && new Date(user.trialEndsAt) > now) {
      const daysLeft = Math.ceil((new Date(user.trialEndsAt) - now) / (1000 * 60 * 60 * 24));
      req.trialInfo = { daysLeft };
      return next();
    }

    // Se il trial è scaduto e non c'è una subscription attiva
    return res.status(403).json({ 
      message: "Accesso scaduto. Per favore, sottoscrivi un abbonamento per continuare.",
      code: "SUBSCRIPTION_EXPIRED",
      redirectTo: "/payment",
      trialEndsAt: user.trialEndsAt,
      subscriptionEndDate: user.subscriptionEndDate
    });

  } catch (error) {
    console.error("Errore nel middleware di controllo subscription:", error);
    res.status(500).json({ message: "Errore del server nel controllo accesso." });
  }
};

module.exports = { subscriptionStatusMiddleware }; 