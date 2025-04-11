const Subscription = require('../models/Subscription');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create a new subscription with payment
const createSubscription = async (req, res) => {
  try {
    const { plan, paymentMethodId } = req.body;
    const userId = req.user.id;

    // Verifica che l'utente esista
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    const plans = {
      monthly: 20000,
      semiannual: 80000,
      annual: 120000,
    };

    if (!plans[plan]) {
      return res.status(400).json({ message: "Piano non valido" });
    }

    const amount = plans[plan];

    // Crea il PaymentIntent con la configurazione corretta
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'eur',
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      return_url: 'https://banana-backend-3.onrender.com/api/payments/success'
    });

    // Trova la sottoscrizione esistente
    const existingSubscription = await Subscription.findOne({ user: userId });
    
    // Calcola le date di inizio e fine abbonamento
    const startDate = new Date();
    let endDate = new Date(startDate);
    
    if (plan === 'monthly') {
      endDate.setMonth(startDate.getMonth() + 1);
    } else if (plan === 'semiannual') {
      endDate.setMonth(startDate.getMonth() + 6);
    } else if (plan === 'annual') {
      endDate.setFullYear(startDate.getFullYear() + 1);
    }

    let subscription;
    if (existingSubscription) {
      // Aggiorna la sottoscrizione esistente
      subscription = await Subscription.findByIdAndUpdate(
        existingSubscription._id,
        {
          plan,
          amount,
          paymentMethodId,
          status: 'active',
          startDate,
          endDate,
          chargeId: paymentIntent.id,
          lastPaymentDate: new Date(),
          nextPaymentDate: endDate
        },
        { new: true }
      );
    } else {
      // Crea una nuova sottoscrizione
      subscription = await Subscription.create({
        user: userId,
        plan,
        amount,
        paymentMethodId,
        status: 'active',
        startDate,
        endDate,
        chargeId: paymentIntent.id,
        lastPaymentDate: new Date(),
        nextPaymentDate: endDate
      });
    }

    // Aggiorna il modello User
    await User.findByIdAndUpdate(userId, {
      isSubscribed: true,
      subscriptionPlan: plan,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      isTrial: false
    });

    res.status(201).json({
      message: 'Subscription created/updated successfully',
      subscription,
      user: {
        isSubscribed: true,
        subscriptionPlan: plan,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate
      }
    });
  } catch (error) {
    console.error('Subscription creation/update error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing the subscription',
      code: '500',
      details: error.message
    });
  }
};

// Confirm subscription after payment
const confirmSubscription = async (req, res) => {
  try {
    const { userId, plan, amount, chargeId } = req.body;

    if (!userId || !plan || !amount || !chargeId) {
      return res.status(400).json({ message: "Tutti i campi sono obbligatori" });
    }

    // Calcola le date di inizio e fine abbonamento
    const startDate = new Date();
    let endDate = new Date(startDate);
    
    if (plan === 'monthly') {
      endDate.setMonth(startDate.getMonth() + 1);
    } else if (plan === 'semiannual') {
      endDate.setMonth(startDate.getMonth() + 6);
    } else if (plan === 'annual') {
      endDate.setFullYear(startDate.getFullYear() + 1);
    }

    // Crea la sottoscrizione
    const subscription = await Subscription.create({
      user: userId,
      plan,
      amount,
      status: 'active',
      chargeId,
      startDate: startDate,
      endDate: endDate,
    });

    // Aggiorna il modello User
    await User.findByIdAndUpdate(userId, {
      isSubscribed: true,
      subscriptionPlan: plan,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      isTrial: false // Disattiva il trial quando viene creato un abbonamento
    });

    res.status(201).json({ 
      message: "Abbonamento salvato con successo", 
      subscription,
      user: {
        isSubscribed: true,
        subscriptionPlan: plan,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate
      }
    });
  } catch (error) {
    console.error("❌ Errore nel salvataggio:", error.message);
    res.status(500).json({ message: "Errore interno", error: error.message });
  }
};

// Get subscription status for the current user
const getSubscriptionStatus = async (req, res) => {
  console.log('🔍 [getSubscriptionStatus] Inizio richiesta');
  try {
    // Check if user is authenticated
    if (!req.user) {
      console.log('❌ [getSubscriptionStatus] Utente non autenticato');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    console.log('✅ [getSubscriptionStatus] Utente autenticato:', req.user._id);

    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('❌ [getSubscriptionStatus] Utente non trovato nel database');
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }

    console.log('✅ [getSubscriptionStatus] Utente trovato:', {
      id: user._id,
      isSubscribed: user.isSubscribed,
      trialEndsAt: user.trialEndsAt
    });

    // Calcola le date di scadenza
    const now = new Date();
    const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
    const subscriptionEndDate = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
    
    // Verifica se il trial è scaduto
    const trialExpired = trialEndsAt ? now > trialEndsAt : true;
    
    // Verifica se l'abbonamento è scaduto
    const subscriptionExpired = subscriptionEndDate ? now > subscriptionEndDate : true;
    
    // Verifica se l'utente ha un abbonamento attivo
    const hasActiveSubscription = user.isSubscribed && !subscriptionExpired;
    
    // Verifica se l'utente è nel periodo di trial
    const isInTrial = user.isTrial && !trialExpired;
    
    // Calcola i giorni rimanenti
    const daysLeftInTrial = isInTrial ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const daysLeftInSubscription = hasActiveSubscription ? Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    console.log('📊 [getSubscriptionStatus] Stato abbonamento:', {
      hasActiveSubscription,
      isInTrial,
      trialExpired,
      subscriptionExpired,
      daysLeftInTrial,
      daysLeftInSubscription,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionEndDate: user.subscriptionEndDate,
      trialEndsAt: user.trialEndsAt
    });

    return res.status(200).json({
      success: true,
      data: {
        hasActiveSubscription,
        isInTrial,
        trialExpired,
        subscriptionExpired,
        daysLeftInTrial,
        daysLeftInSubscription,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        trialEndsAt: user.trialEndsAt,
        accessAllowed: hasActiveSubscription || isInTrial
      }
    });
  } catch (error) {
    console.error('❌ [getSubscriptionStatus] Errore:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while checking subscription status',
      details: error.message
    });
  }
};

// Renew an existing subscription
const renewSubscription = async (req, res) => {
  try {
    const { plan, paymentMethodId } = req.body;
    const userId = req.user.id;

    // Verifica che l'utente esista
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    const plans = {
      monthly: 20000,
      semiannual: 80000,
      annual: 120000,
    };

    if (!plans[plan]) {
      return res.status(400).json({ message: "Piano non valido" });
    }

    const amount = plans[plan];

    // Crea il PaymentIntent con la configurazione corretta
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'eur',
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      return_url: 'https://banana-backend-3.onrender.com/api/payments/success'
    });

    // Trova la sottoscrizione esistente
    const existingSubscription = await Subscription.findOne({ user: userId });
    if (!existingSubscription) {
      return res.status(400).json({
        message: 'Nessuna sottoscrizione esistente trovata'
      });
    }

    // Calcola le nuove date
    const startDate = new Date();
    let endDate = new Date(startDate);
    
    if (plan === 'monthly') {
      endDate.setMonth(startDate.getMonth() + 1);
    } else if (plan === 'semiannual') {
      endDate.setMonth(startDate.getMonth() + 6);
    } else if (plan === 'annual') {
      endDate.setFullYear(startDate.getFullYear() + 1);
    }

    // Aggiorna la sottoscrizione esistente
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      existingSubscription._id,
      {
        plan,
        amount,
        paymentMethodId,
        status: 'active',
        startDate,
        endDate,
        chargeId: paymentIntent.id,
        lastPaymentDate: new Date(),
        nextPaymentDate: endDate
      },
      { new: true }
    );

    // Aggiorna il modello User
    await User.findByIdAndUpdate(userId, {
      isSubscribed: true,
      subscriptionPlan: plan,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      isTrial: false
    });

    res.status(200).json({
      message: 'Subscription renewed successfully',
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error('Subscription renewal error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while renewing the subscription',
      code: '500',
      details: error
    });
  }
};

module.exports = { 
  createSubscription, 
  confirmSubscription, 
  getSubscriptionStatus,
  renewSubscription 
};
