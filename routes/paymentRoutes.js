const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/subscriptionModel');
const User = require('../models/User');
const crypto = require('crypto');

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
    const successUrl = `${req.protocol}://${req.get('host')}/api/payments/process-success?userId=${userId}&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${req.protocol}://${req.get('host')}/payment-cancel.html`;
    
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
// Questo endpoint non deve essere accessibile pubblicamente, ma solo tramite webhook Stripe verificato
// o con autenticazione forte e verifiche aggiuntive

// Rimuoviamo l'endpoint vulnerabile e usiamo solo il webhook Stripe per le conferme
// router.post('/confirm-subscription', async (req, res) => { ... });

// Handle direct access to success page from Stripe redirect
router.get('/process-success', async (req, res) => {
  try {
    const { userId, plan, session_id } = req.query;
    
    if (!userId || !plan || !session_id) {
      console.error('❌ Missing required parameters in success redirect');
      return res.status(400).send('Missing required parameters');
    }
    
    // IMPORTANTE: Verifica che la sessione Stripe esista ed è stata pagata
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      
      // Verifica che la sessione sia pagata e che l'utente corrisponda
      if (session.payment_status !== 'paid') {
        console.error('❌ Payment not completed for session:', session_id);
        return res.status(403).send('Payment not completed. Please complete your payment first.');
      }
      
      // Verifica che l'userId nel metadata della sessione corrisponda a quello nella query
      if (session.metadata.userId !== userId) {
        console.error('❌ User ID mismatch in success redirect');
        return res.status(403).send('Invalid request parameters');
      }
      
      // Verifica che il piano nel metadata della sessione corrisponda a quello nella query
      if (session.metadata.plan !== plan) {
        console.error('❌ Plan mismatch in success redirect');
        return res.status(403).send('Invalid request parameters');
      }
    } catch (error) {
      console.error('❌ Error retrieving Stripe session:', error);
      return res.status(400).send('Invalid session ID');
    }
    
    // Generate a cryptographic signature to prevent URL tampering
    const signature = crypto.createHmac('sha256', process.env.JWT_SECRET)
      .update(`${userId}-${plan}-${session_id}`)
      .digest('hex');
    
    // Redirect to the success page with a secure token
    res.redirect(`/payment-success.html?token=${signature}`);
  } catch (error) {
    console.error('❌ Error processing successful payment:', error);
    res.status(500).send('Error processing payment. Please contact support.');
  }
});

// Nuovo endpoint per verificare l'abbonamento sul frontend dopo redirect
router.post('/verify-subscription', async (req, res) => {
  try {
    const { userId, plan, session_id, token } = req.body;
    
    if (!userId || !plan || !session_id || !token) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }
    
    // Verifica la firma del token
    const expectedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET)
      .update(`${userId}-${plan}-${session_id}`)
      .digest('hex');
    
    if (token !== expectedSignature) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    
    // Verifica che la sessione Stripe esista e sia stata pagata
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== 'paid') {
      return res.status(403).json({ success: false, message: 'Payment not completed' });
    }
    
    // A questo punto, la conferma è sicura - possiamo aggiornare l'abbonamento
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
          nextPaymentDate: endDate,
          chargeId: session.payment_intent // Memorizza il payment_intent per riferimento
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
        nextPaymentDate: endDate,
        chargeId: session.payment_intent
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
    
    console.log(`✅ Subscription verified and processed for user: ${userId}, plan: ${plan}`);
    
    res.json({
      success: true, 
      message: 'Subscription successfully activated',
      subscription: {
        plan,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('❌ Error verifying subscription:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error verifying subscription', 
      error: error.message 
    });
  }
});

module.exports = router;
