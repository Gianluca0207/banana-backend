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
    
    // Generate a unique idempotency key based on user, plan and timestamp
    const idempotencyKey = crypto.createHash('sha256')
      .update(`${userId}-${plan}-${Date.now()}`)
      .digest('hex');
    
    // Check if there's a pending payment session for this user/plan
    const pendingSubscription = await Subscription.findOne({ 
      user: userId, 
      plan: plan,
      status: 'pending',
      paymentStatus: { $in: ['pending', 'requires_payment_method', 'requires_action'] },
      createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) } // Created within the last 30 minutes
    });
    
    if (pendingSubscription) {
      // If there's a pending session, notify the frontend
      return res.status(409).json({
        success: false,
        message: 'A payment for this plan is already in progress',
        pendingPaymentId: pendingSubscription._id,
        timeSinceCreated: Date.now() - new Date(pendingSubscription.createdAt).getTime(),
        requiresAction: pendingSubscription.paymentStatus === 'requires_action'
      });
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
    const successUrl = `${req.protocol}://${req.get('host')}/api/payments/process-success?userId=${userId}&plan=${plan}&session_id={CHECKOUT_SESSION_ID}&idempotency_key=${idempotencyKey}`;
    const cancelUrl = `${req.protocol}://${req.get('host')}/payment-cancel.html?userId=${userId}&plan=${plan}&idempotency_key=${idempotencyKey}&status=canceled`;
    
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
    
    // Create or update subscription record with pending status
    // This allows us to track the payment attempt even if the user cancels
    let subscription = await Subscription.findOne({ user: userId });
    
    if (subscription) {
      // If there's already a subscription, create a pending update
      subscription.plan = plan;
      subscription.status = 'pending';
      subscription.paymentStatus = 'pending';
      subscription.failureReason = null;
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.paymentAttempts = (subscription.paymentAttempts || 0) + 1;
      subscription.lastPaymentAttempt = new Date();
      subscription.idempotencyKey = idempotencyKey;
      
      await subscription.save();
    } else {
      // Create new subscription record with pending status
      subscription = await Subscription.create({
        user: userId,
        plan: plan,
        amount: plans[plan].amount,
        status: 'pending',
        paymentStatus: 'pending',
        startDate: startDate,
        endDate: endDate,
        paymentAttempts: 1,
        lastPaymentAttempt: new Date(),
        idempotencyKey: idempotencyKey
      });
    }
    
    // Save the payment attempt in the history
    if (!subscription.paymentHistory) {
      subscription.paymentHistory = [];
    }
    
    subscription.paymentHistory.push({
      date: new Date(),
      status: 'pending',
      amount: plans[plan].amount,
      idempotencyKey: idempotencyKey
    });
    
    await subscription.save();
    
    // Crea una sessione di checkout using the idempotency key to prevent duplicate charges
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
        plan: plan,
        idempotencyKey: idempotencyKey
      }
    }, {
      idempotencyKey // This ensures Stripe won't create duplicate sessions if the request is retried
    });
    
    // Update subscription with session ID
    subscription.paymentHistory[subscription.paymentHistory.length - 1].sessionId = session.id;
    await subscription.save();
    
    // Registra i dettagli della sessione per riferimento futuro (opzionale)
    console.log(`✅ Sessione di checkout creata: ${session.id} per l'utente ${userId}, piano ${plan}, idempotencyKey: ${idempotencyKey}`);
    
    res.json({ 
      success: true, 
      sessionId: session.id, 
      url: session.url,
      idempotencyKey: idempotencyKey
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
    
    // Log the event type for debugging
    console.log(`✅ Stripe webhook received: ${event.type}`);
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error(`❌ Errore webhook: ${error.message}`);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Process successful checkout session
async function handleCheckoutSessionCompleted(session) {
  try {
    // Recupera i metadata
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;
    const idempotencyKey = session.metadata.idempotencyKey;
    
    if (!userId || !plan) {
      console.error('❌ Metadata mancanti nell\'evento Stripe');
      return;
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
    
    // Check if the payment was already processed using idempotency key
    let subscription;
    
    if (idempotencyKey) {
      subscription = await Subscription.findOne({ 
        user: userId,
        idempotencyKey: idempotencyKey
      });
    } else {
      // Fallback to the old method if idempotencyKey is not present
      subscription = await Subscription.findOne({ user: userId });
    }
    
    if (subscription) {
      // Check if this payment was already processed
      const isProcessed = subscription.paymentHistory?.some(
        h => h.sessionId === session.id && h.status === 'succeeded'
      );
      
      if (isProcessed) {
        console.log(`⚠️ Payment already processed for session: ${session.id}`);
        return;
      }
      
      // Update the existing subscription
      subscription.plan = plan;
      subscription.amount = session.amount_total;
      subscription.status = 'active';
      subscription.paymentStatus = 'succeeded';
      subscription.failureReason = null;
      subscription.chargeId = session.payment_intent;
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.lastPaymentDate = new Date();
      subscription.nextPaymentDate = endDate;
      
      // Update the payment history
      if (!subscription.paymentHistory) {
        subscription.paymentHistory = [];
      }
      
      // Check if there's a pending entry for this session
      const pendingEntryIndex = subscription.paymentHistory.findIndex(
        h => h.sessionId === session.id && h.status === 'pending'
      );
      
      if (pendingEntryIndex !== -1) {
        // Update the pending entry
        subscription.paymentHistory[pendingEntryIndex].status = 'succeeded';
        subscription.paymentHistory[pendingEntryIndex].amount = session.amount_total;
      } else {
        // Add a new entry
        subscription.paymentHistory.push({
          date: new Date(),
          status: 'succeeded',
          sessionId: session.id,
          amount: session.amount_total,
          idempotencyKey: idempotencyKey
        });
      }
      
      await subscription.save();
    } else {
      // Create a new subscription
      subscription = await Subscription.create({
        user: userId,
        plan,
        amount: session.amount_total,
        status: 'active',
        paymentStatus: 'succeeded',
        chargeId: session.payment_intent,
        startDate,
        endDate,
        lastPaymentDate: new Date(),
        nextPaymentDate: endDate,
        idempotencyKey: idempotencyKey,
        paymentHistory: [{
          date: new Date(),
          status: 'succeeded',
          sessionId: session.id,
          amount: session.amount_total,
          idempotencyKey: idempotencyKey
        }]
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
  } catch (error) {
    console.error(`❌ Error processing checkout.session.completed: ${error.message}`);
    throw error;
  }
}

// Handle expired checkout session
async function handleCheckoutSessionExpired(session) {
  try {
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;
    const idempotencyKey = session.metadata.idempotencyKey;
    
    if (!userId || !plan) {
      console.error('❌ Metadata missing in checkout.session.expired event');
      return;
    }
    
    // Find the subscription
    const subscription = await Subscription.findOne({
      user: userId,
      idempotencyKey: idempotencyKey
    });
    
    if (!subscription) {
      console.error(`❌ No subscription found for user: ${userId}, idempotencyKey: ${idempotencyKey}`);
      return;
    }
    
    // Update subscription status
    subscription.paymentStatus = 'canceled';
    subscription.status = 'payment_cancelled';
    subscription.failureReason = 'session_expired';
    
    // Update payment history
    if (!subscription.paymentHistory) {
      subscription.paymentHistory = [];
    }
    
    const historyIndex = subscription.paymentHistory.findIndex(
      h => h.sessionId === session.id
    );
    
    if (historyIndex !== -1) {
      subscription.paymentHistory[historyIndex].status = 'expired';
      subscription.paymentHistory[historyIndex].failureReason = 'session_expired';
    } else {
      subscription.paymentHistory.push({
        date: new Date(),
        status: 'expired',
        sessionId: session.id,
        failureReason: 'session_expired',
        idempotencyKey: idempotencyKey
      });
    }
    
    await subscription.save();
    
    console.log(`✅ Subscription marked as expired for user: ${userId}, plan: ${plan}`);
  } catch (error) {
    console.error(`❌ Error processing checkout.session.expired: ${error.message}`);
    throw error;
  }
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent) {
  try {
    // Retrieve the session to get metadata
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1
    });
    
    if (!sessions.data.length) {
      console.error(`❌ No session found for payment_intent: ${paymentIntent.id}`);
      return;
    }
    
    const session = sessions.data[0];
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;
    const idempotencyKey = session.metadata.idempotencyKey;
    
    if (!userId || !plan) {
      console.error('❌ Metadata missing in payment_intent.payment_failed event');
      return;
    }
    
    // Determine failure reason
    let failureReason = 'unknown';
    if (paymentIntent.last_payment_error) {
      const errorCode = paymentIntent.last_payment_error.code;
      
      if (errorCode === 'card_declined') {
        failureReason = 'card_declined';
      } else if (errorCode === 'expired_card') {
        failureReason = 'expired_card';
      } else if (errorCode === 'authentication_required') {
        failureReason = 'authentication_required';
      } else if (errorCode === 'insufficient_funds') {
        failureReason = 'insufficient_funds';
      } else if (errorCode === 'processing_error') {
        failureReason = 'network_error';
      }
    }
    
    // Find the subscription
    const subscription = await Subscription.findOne({
      user: userId,
      idempotencyKey: idempotencyKey
    });
    
    if (!subscription) {
      console.error(`❌ No subscription found for user: ${userId}, idempotencyKey: ${idempotencyKey}`);
      return;
    }
    
    // Update subscription status
    subscription.paymentStatus = 'failed';
    subscription.status = 'payment_failed';
    subscription.failureReason = failureReason;
    
    // Update payment history
    if (!subscription.paymentHistory) {
      subscription.paymentHistory = [];
    }
    
    const historyIndex = subscription.paymentHistory.findIndex(
      h => h.sessionId === session.id
    );
    
    if (historyIndex !== -1) {
      subscription.paymentHistory[historyIndex].status = 'failed';
      subscription.paymentHistory[historyIndex].failureReason = failureReason;
    } else {
      subscription.paymentHistory.push({
        date: new Date(),
        status: 'failed',
        sessionId: session.id,
        failureReason: failureReason,
        idempotencyKey: idempotencyKey
      });
    }
    
    await subscription.save();
    
    console.log(`✅ Subscription payment marked as failed for user: ${userId}, plan: ${plan}, reason: ${failureReason}`);
  } catch (error) {
    console.error(`❌ Error processing payment_intent.payment_failed: ${error.message}`);
    throw error;
  }
}

// Handle canceled payment
async function handlePaymentCanceled(paymentIntent) {
  try {
    // Similar to handlePaymentFailed but with canceled status
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1
    });
    
    if (!sessions.data.length) {
      console.error(`❌ No session found for payment_intent: ${paymentIntent.id}`);
      return;
    }
    
    const session = sessions.data[0];
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;
    const idempotencyKey = session.metadata.idempotencyKey;
    
    if (!userId || !plan) {
      console.error('❌ Metadata missing in payment_intent.canceled event');
      return;
    }
    
    // Find the subscription
    const subscription = await Subscription.findOne({
      user: userId,
      idempotencyKey: idempotencyKey
    });
    
    if (!subscription) {
      console.error(`❌ No subscription found for user: ${userId}, idempotencyKey: ${idempotencyKey}`);
      return;
    }
    
    // Update subscription status
    subscription.paymentStatus = 'canceled';
    subscription.status = 'payment_cancelled';
    subscription.failureReason = 'user_canceled';
    
    // Update payment history
    if (!subscription.paymentHistory) {
      subscription.paymentHistory = [];
    }
    
    const historyIndex = subscription.paymentHistory.findIndex(
      h => h.sessionId === session.id
    );
    
    if (historyIndex !== -1) {
      subscription.paymentHistory[historyIndex].status = 'canceled';
      subscription.paymentHistory[historyIndex].failureReason = 'user_canceled';
    } else {
      subscription.paymentHistory.push({
        date: new Date(),
        status: 'canceled',
        sessionId: session.id,
        failureReason: 'user_canceled',
        idempotencyKey: idempotencyKey
      });
    }
    
    await subscription.save();
    
    console.log(`✅ Subscription payment marked as canceled for user: ${userId}, plan: ${plan}`);
  } catch (error) {
    console.error(`❌ Error processing payment_intent.canceled: ${error.message}`);
    throw error;
  }
}

// Handle successful payment
async function handlePaymentSucceeded(paymentIntent) {
  try {
    // This overlaps with checkout.session.completed, but we'll handle it for completeness
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1
    });
    
    if (!sessions.data.length) {
      console.error(`❌ No session found for payment_intent: ${paymentIntent.id}`);
      return;
    }
    
    const session = sessions.data[0];
    
    // Process the session as completed
    await handleCheckoutSessionCompleted(session);
  } catch (error) {
    console.error(`❌ Error processing payment_intent.succeeded: ${error.message}`);
    throw error;
  }
}

// 🔵 5. Endpoint per confermare l'abbonamento dopo il pagamento (chiamato dall'app mobile)
// Questo endpoint non deve essere accessibile pubblicamente, ma solo tramite webhook Stripe verificato
// o con autenticazione forte e verifiche aggiuntive

// Rimuoviamo l'endpoint vulnerabile e usiamo solo il webhook Stripe per le conferme
// router.post('/confirm-subscription', async (req, res) => { ... });

// Handle direct access to success page from Stripe redirect
router.get('/process-success', async (req, res) => {
  try {
    const { userId, plan, session_id, idempotency_key } = req.query;
    
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
      
      // Check if idempotency key matches if it exists
      if (idempotency_key && session.metadata.idempotencyKey && 
          session.metadata.idempotencyKey !== idempotency_key) {
        console.error('❌ Idempotency key mismatch in success redirect');
        return res.status(403).send('Invalid request parameters');
      }
    } catch (error) {
      console.error('❌ Error retrieving Stripe session:', error);
      return res.status(400).send('Invalid session ID');
    }
    
    // Generate a cryptographic signature to prevent URL tampering
    const signature = crypto.createHmac('sha256', process.env.JWT_SECRET)
      .update(`${userId}-${plan}-${session_id}-${idempotency_key || ''}`)
      .digest('hex');
    
    // Redirect to the success page with a secure token
    res.redirect(`/payment-success.html?token=${signature}&userId=${userId}&plan=${plan}&session_id=${session_id}${idempotency_key ? `&idempotency_key=${idempotency_key}` : ''}`);
  } catch (error) {
    console.error('❌ Error processing successful payment:', error);
    res.status(500).send('Error processing payment. Please contact support.');
  }
});

// Nuovo endpoint per verificare l'abbonamento sul frontend dopo redirect
router.post('/verify-subscription', async (req, res) => {
  try {
    const { userId, plan, session_id, token, idempotencyKey } = req.body;
    
    if (!userId || !plan || !session_id || !token) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }
    
    // Verifica la firma del token
    const expectedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET)
      .update(`${userId}-${plan}-${session_id}-${idempotencyKey || ''}`)
      .digest('hex');
    
    if (token !== expectedSignature) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    
    // Check if this subscription has already been verified (idempotency check)
    if (idempotencyKey) {
      const existingActivation = await Subscription.findOne({
        user: userId,
        idempotencyKey: idempotencyKey,
        paymentStatus: 'succeeded'
      });
      
      if (existingActivation) {
        // Already successfully activated, just return the info
        return res.json({
          success: true,
          message: 'Subscription already activated',
          subscription: {
            plan: existingActivation.plan,
            startDate: existingActivation.startDate,
            endDate: existingActivation.endDate
          }
        });
      }
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
    
    // Find subscription by idempotency key if available, otherwise by user ID
    let existingSubscription;
    if (idempotencyKey) {
      existingSubscription = await Subscription.findOne({ 
        user: userId,
        idempotencyKey: idempotencyKey
      });
    } else {
      existingSubscription = await Subscription.findOne({ user: userId });
    }
    
    let subscription;
    
    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.plan = plan;
      existingSubscription.status = 'active';
      existingSubscription.paymentStatus = 'succeeded';
      existingSubscription.startDate = startDate;
      existingSubscription.endDate = endDate;
      existingSubscription.lastPaymentDate = new Date();
      existingSubscription.nextPaymentDate = endDate;
      existingSubscription.chargeId = session.payment_intent;
      
      // Add to payment history
      if (!existingSubscription.paymentHistory) {
        existingSubscription.paymentHistory = [];
      }
      
      // Check if entry already exists
      const entryIndex = existingSubscription.paymentHistory.findIndex(
        h => h.sessionId === session_id
      );
      
      if (entryIndex !== -1) {
        existingSubscription.paymentHistory[entryIndex].status = 'succeeded';
      } else {
        existingSubscription.paymentHistory.push({
          date: new Date(),
          status: 'succeeded',
          sessionId: session_id,
          amount: session.amount_total,
          idempotencyKey: idempotencyKey
        });
      }
      
      subscription = await existingSubscription.save();
    } else {
      // Create new subscription
      subscription = await Subscription.create({
        user: userId,
        plan,
        status: 'active',
        paymentStatus: 'succeeded',
        startDate,
        endDate,
        lastPaymentDate: new Date(),
        nextPaymentDate: endDate,
        chargeId: session.payment_intent,
        idempotencyKey: idempotencyKey,
        paymentHistory: [{
          date: new Date(),
          status: 'succeeded',
          sessionId: session_id,
          amount: session.amount_total,
          idempotencyKey: idempotencyKey
        }]
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

// Handle payment status updates (success, cancel, failure)
router.post('/handle-payment-status', async (req, res) => {
  try {
    const { userId, plan, idempotencyKey, status, cancelReason, failureReason } = req.body;
    
    if (!userId || !plan || !idempotencyKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters'
      });
    }
    
    // Find the subscription by idempotencyKey
    const subscription = await Subscription.findOne({ 
      user: userId,
      idempotencyKey: idempotencyKey
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found with the provided idempotency key'
      });
    }
    
    // Update the subscription status
    let paymentStatus = status;
    let subscriptionStatus = subscription.status;
    
    // Map common statuses
    switch (status) {
      case 'canceled':
        paymentStatus = 'canceled';
        subscriptionStatus = 'payment_cancelled';
        break;
      case 'failed':
        paymentStatus = 'failed';
        subscriptionStatus = 'payment_failed';
        break;
      case 'succeeded':
        paymentStatus = 'succeeded';
        subscriptionStatus = 'active';
        break;
      default:
        paymentStatus = status;
    }
    
    // Update the subscription record
    subscription.paymentStatus = paymentStatus;
    subscription.status = subscriptionStatus;
    
    if (cancelReason) {
      subscription.failureReason = cancelReason;
    }
    
    if (failureReason) {
      subscription.failureReason = failureReason;
    }
    
    // Add to payment history
    if (!subscription.paymentHistory) {
      subscription.paymentHistory = [];
    }
    
    // Find the existing history entry with this idempotencyKey
    const historyIndex = subscription.paymentHistory.findIndex(
      entry => entry.idempotencyKey === idempotencyKey
    );
    
    if (historyIndex !== -1) {
      // Update existing entry
      subscription.paymentHistory[historyIndex].status = paymentStatus;
      if (cancelReason) {
        subscription.paymentHistory[historyIndex].failureReason = cancelReason;
      }
      if (failureReason) {
        subscription.paymentHistory[historyIndex].failureReason = failureReason;
      }
    } else {
      // Create new entry
      subscription.paymentHistory.push({
        date: new Date(),
        status: paymentStatus,
        failureReason: cancelReason || failureReason,
        idempotencyKey: idempotencyKey
      });
    }
    
    await subscription.save();
    
    console.log(`✅ Payment status updated for user: ${userId}, plan: ${plan}, status: ${paymentStatus}`);
    
    res.json({
      success: true,
      message: 'Payment status updated successfully',
      status: paymentStatus
    });
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment status',
      error: error.message
    });
  }
});

module.exports = router;
