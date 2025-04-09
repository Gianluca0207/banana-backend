const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/subscriptionModel');

// 🔁 1. Controlla se il free trial è scaduto
router.get('/check-trial/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const subscription = await Subscription.findOne({ user: userId });

    if (!subscription) {
      return res.status(404).json({ trialValid: false, message: 'Subscription not found' });
    }

    const now = new Date();
    const trialValid = now < new Date(subscription.trialEnd);

    res.status(200).json({ trialValid });
  } catch (error) {
    console.error("❌ Errore nel controllo del trial:", error.message);
    res.status(500).json({ message: "Errore interno", error: error.message });
  }
});

// 💳 2. Crea un PaymentIntent e restituisce il clientSecret
router.post('/create-intent', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('❌ Errore nella creazione del PaymentIntent:', error.message);
    res.status(500).json({ message: 'Errore nel creare PaymentIntent', error: error.message });
  }
});

module.exports = router;
