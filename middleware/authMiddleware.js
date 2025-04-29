const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 📌 Middleware per proteggere le rotte (verifica token)
const protect = async (req, res, next) => {
    let token;

    console.log(`🔍 Richiesta ${req.method} a ${req.path}`);
    console.log('Headers:', req.headers);

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];  // 📌 Estrai il token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token decodificato:', decoded);

            req.user = await User.findById(decoded.id).select("-password");
            console.log('Utente trovato:', req.user ? 'Sì' : 'No');

            if (!req.user) {
                return res.status(401).json({ message: "User not found" });
            }

            next();  // 🔓 Continua alla prossima funzione middleware
        } catch (error) {
            console.error('Errore autenticazione:', error);
            return res.status(401).json({ message: "Invalid token" });
        }
    } else {
        console.log('Token mancante nei headers');
        return res.status(401).json({ message: "Access denied, token missing" });
    }
};

// 📌 Middleware per verificare se l'utente è admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({ message: "Access denied, admin only" });
    }
};

// 📌 Funzione per ottenere i dati utente e validare accesso (trial e abbonamento)
const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;

        // 🔐 Verifica se il trial è scaduto
        const now = new Date();
        const trialExpired = user.isTrial && new Date(user.trialEndsAt) < now;

        const accessAllowed = !trialExpired || user.isSubscribed;

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isTrial: user.isTrial,
            trialEndsAt: user.trialEndsAt,
            isSubscribed: user.isSubscribed,
            trialExpired,
            accessAllowed
        });
    } catch (error) {
        console.error("Error retrieving user:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { protect, isAdmin, getCurrentUser };
