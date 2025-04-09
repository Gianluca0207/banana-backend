// backend/middleware/errorMiddleware.js

// Questo middleware gestisce l'errore 404 (risorsa non trovata)
const notFound = (req, res, next) => {
    // Crea un nuovo errore con un messaggio che include l'URL richiesto
    const error = new Error(`Non trovato - ${req.originalUrl}`);
    // Imposta lo status HTTP su 404
    res.status(404);
    // Passa l'errore al middleware successivo
    next(error);
  };
  
  // Questo middleware centralizzato gestisce tutti gli errori
  const errorHandler = (err, req, res, next) => {
    // Stampa l'errore nella console (utile per il debug)
    console.error(err.stack);
    // Se lo status era 200, lo trasforma in 500 (errore interno del server)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    // Imposta lo status della risposta
    res.status(statusCode);
    // Manda la risposta in formato JSON
    res.json({
      message: err.message,
      // Mostra lo stack di errori solo se NON sei in produzione
      stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
  };
  
  // Esporta le funzioni per poterle usare in altri file
  module.exports = { notFound, errorHandler };
  