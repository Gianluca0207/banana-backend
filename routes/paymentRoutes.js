const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/subscriptionModel');
const User = require('../models/User');

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

// 🔵 3. Crea una sessione di checkout Stripe e restituisce l'URL
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan, userId, email } = req.body;
    
    if (!plan || !userId || !email) {
      return res.status(400).json({ message: 'Plan, userId and email are required' });
    }
    
    const plans = {
      monthly: {
        amount: 20000,
        name: 'Monthly Subscription to BananaTracker'
      },
      semiannual: {
        amount: 80000,
        name: 'Semiannul Subscription to BananaTracker'
      },
      annual: {
        amount: 120000,
        name: 'Annual Subscription to BananaTracker'
      }
    };
    
    if (!plans[plan]) {
      return res.status(400).json({ message: "Invalid plan" });
    }
    
    // URL di successo e cancellazione
    const successUrl = `https://banana-backend-3.onrender.com/api/payments/process-success?userId=${userId}&plan=${plan}`;
    const cancelUrl = `https://banana-backend-3.onrender.com/api/payments/process-cancel`;
    
    // Crea una sessione di checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: plans[plan].name,
              description: `Accesso completo a tutte le funzionalità di BananaTrack (${plan})`,
            },
            unit_amount: plans[plan].amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      metadata: {
        userId: userId,
        plan: plan
      },
    });
    
    // Registra i dettagli della sessione per riferimento futuro (opzionale)
    console.log(`✅ Sessione di checkout creata: ${session.id} per l'utente ${userId}, piano ${plan}`);
    
    res.json({ 
      success: true, 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating session', 
      error: error.message 
    });
  }
});

// 🔵 4. Endpoint webhook per gestire eventi Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // Aggiungi questa variabile al tuo file .env
  
  let event;
  
  try {
    // Verifica la firma dell'evento
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      // In ambiente di sviluppo potresti non avere il secret
      event = JSON.parse(req.body);
    }
    
    // Gestisci l'evento di pagamento completato
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Recupera i metadata
      const userId = session.metadata.userId;
      const plan = session.metadata.plan;
      
      if (!userId || !plan) {
        console.error('❌ Metadata mancanti nell\'evento Stripe');
        return res.status(400).json({ received: true, error: 'Metadata missing' });
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
      
      // Verifica se esiste già una sottoscrizione
      const existingSubscription = await Subscription.findOne({ user: userId });
      
      if (existingSubscription) {
        // Aggiorna la sottoscrizione esistente
        await Subscription.findByIdAndUpdate(
          existingSubscription._id,
          {
            plan,
            amount: session.amount_total,
            status: 'active',
            chargeId: session.payment_intent,
            startDate,
            endDate,
            lastPaymentDate: new Date(),
            nextPaymentDate: endDate
          }
        );
      } else {
        // Crea una nuova sottoscrizione
        await Subscription.create({
          user: userId,
          plan,
          amount: session.amount_total,
          status: 'active',
          chargeId: session.payment_intent,
          startDate,
          endDate,
          lastPaymentDate: new Date(),
          nextPaymentDate: endDate
        });
      }
      
      // Aggiorna i dati dell'utente
      await User.findByIdAndUpdate(userId, {
        isSubscribed: true,
        subscriptionPlan: plan,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        isTrial: false
      });
      
      console.log(`✅ Abbonamento aggiornato per l'utente: ${userId}, piano: ${plan}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error(`❌ Errore webhook: ${error.message}`);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// 🔵 5. Endpoint per confermare l'abbonamento dopo il pagamento (chiamato dall'app mobile)
router.post('/confirm-subscription', async (req, res) => {
  try {
    const { userId, plan } = req.body;
    
    if (!userId || !plan) {
      return res.status(400).json({ success: false, message: 'userId and plan are required' });
    }
    
    // Verifica che l'utente esista
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Calcola le date di abbonamento
    const startDate = new Date();
    let endDate = new Date(startDate);
    
    if (plan === 'monthly') {
      endDate.setMonth(startDate.getMonth() + 1);
    } else if (plan === 'semiannual') {
      endDate.setMonth(startDate.getMonth() + 6);
    } else if (plan === 'annual') {
      endDate.setFullYear(startDate.getFullYear() + 1);
    }
    
    // Aggiorna l'utente (nel caso in cui il webhook non sia stato ricevuto)
    await User.findByIdAndUpdate(userId, {
      isSubscribed: true,
      subscriptionPlan: plan,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      isTrial: false
    });
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isSubscribed: true,
        subscriptionPlan: plan,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate
      }
    });
  } catch (error) {
    console.error('❌ Errore conferma abbonamento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error confirming subscription', 
      error: error.message 
    });
  }
});

// Handle direct access to success page from Stripe redirect
router.get('/process-success', async (req, res) => {
  try {
    const { userId, plan } = req.query;
    
    if (!userId || !plan) {
      console.error('❌ Missing userId or plan in success redirect');
      return res.redirect(`bananatrackapp://payment/error?message=${encodeURIComponent('Missing required parameters')}`);
    }
    
    // Calculate subscription dates
    const startDate = new Date();
    let endDate = new Date(startDate);
    
    if (plan === 'monthly') {
      endDate.setMonth(startDate.getMonth() + 1);
    } else if (plan === 'semiannual') {
      endDate.setMonth(startDate.getMonth() + 6);
    } else if (plan === 'annual') {
      endDate.setFullYear(startDate.getFullYear() + 1);
    }
    
    // Check for existing subscription
    const existingSubscription = await Subscription.findOne({ user: userId });
    
    if (existingSubscription) {
      // Update existing subscription
      await Subscription.findByIdAndUpdate(
        existingSubscription._id,
        {
          plan,
          status: 'active',
          startDate,
          endDate,
          lastPaymentDate: new Date(),
          nextPaymentDate: endDate
        }
      );
    } else {
      // Create new subscription
      await Subscription.create({
        user: userId,
        plan,
        status: 'active',
        startDate,
        endDate,
        lastPaymentDate: new Date(),
        nextPaymentDate: endDate
      });
    }
    
    // Update user subscription status
    await User.findByIdAndUpdate(userId, {
      isSubscribed: true,
      subscriptionPlan: plan,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      isTrial: false
    });
    
    console.log(`✅ Subscription processed for user: ${userId}, plan: ${plan}`);
    
    // Redirect to the app
    res.redirect(`bananatrackapp://payment/success?userId=${userId}&plan=${plan}`);
  } catch (error) {
    console.error('❌ Error processing successful payment:', error);
    res.redirect(`bananatrackapp://payment/error?message=${encodeURIComponent(error.message)}`);
  }
});

// Handle cancel redirect
router.get('/process-cancel', (req, res) => {
  res.redirect('bananatrackapp://payment/cancel');
});

module.exports = router;
