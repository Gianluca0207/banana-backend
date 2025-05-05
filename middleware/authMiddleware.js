const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 📌 Middleware per proteggere le rotte (verifica token)
const protect = async (req, res, next) => {
    let token;

    console.log('🔐 [AUTH] Starting token verification for:', {
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            console.log('🔑 [AUTH] Token received:', {
                tokenLength: token.length,
                tokenPrefix: token.substring(0, 10) + '...',
                timestamp: new Date().toISOString()
            });

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('✅ [AUTH] Token decoded successfully:', {
                userId: decoded.id,
                exp: decoded.exp,
                timestamp: new Date().toISOString()
            });

            const user = await User.findById(decoded.id).select("-password");
            console.log('👤 [AUTH] User lookup result:', {
                found: !!user,
                userId: decoded.id,
                timestamp: new Date().toISOString()
            });

            if (!user) {
                console.log('❌ [AUTH] User not found in database');
                return res.status(401).json({ 
                    message: "User not found",
                    errorType: "USER_NOT_FOUND"
                });
            }

            req.user = user;
            console.log('✅ [AUTH] Authentication successful:', {
                userId: user._id,
                email: user.email,
                timestamp: new Date().toISOString()
            });

            next();
        } catch (error) {
            console.error('❌ [AUTH] Token verification failed:', {
                error: error.message,
                name: error.name,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            // Specific error messages based on the type of error
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: "Token expired",
                    errorType: "TOKEN_EXPIRED"
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    message: "Invalid token",
                    errorType: "INVALID_TOKEN"
                });
            }

            return res.status(401).json({ 
                message: "Authentication failed",
                errorType: "AUTH_FAILED"
            });
        }
    } else {
        console.log('❌ [AUTH] No token provided in request');
        return res.status(401).json({ 
            message: "Access denied, token missing",
            errorType: "NO_TOKEN"
        });
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
