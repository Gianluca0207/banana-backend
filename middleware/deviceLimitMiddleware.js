const User = require("../models/User");

const checkDeviceLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const deviceId = req.body.deviceId;

    if (!deviceId) {
      return res.status(400).json({ 
        success: false,
        message: "Device ID is required" 
      });
    }

    // Se il dispositivo è già registrato, aggiorna lastLogin
    const existingDevice = user.activeDevices.find(d => d.deviceId === deviceId);
    if (existingDevice) {
      existingDevice.lastLogin = new Date();
      await user.save();
      return next();
    }

    // Ignora il limite per i dispositivi web
    if (deviceId.startsWith('web-')) {
      // Aggiungi il dispositivo web senza controllare il limite
      user.activeDevices.push({
        deviceId,
        lastLogin: new Date(),
        deviceInfo: req.headers['user-agent']
      });
      await user.save();
      return next();
    }

    // Se non è registrato e abbiamo raggiunto il limite
    if (user.activeDevices.length >= user.maxDevices) {
      return res.status(403).json({ 
        success: false,
        message: "You're trying to access from a third device. Maximum 2 devices allowed per account. Please remove a device from your account settings or contact support.",
        code: "DEVICE_LIMIT_EXCEEDED",
        currentDevices: user.activeDevices.length,
        maxDevices: user.maxDevices
      });
    }

    // Aggiungi il nuovo dispositivo
    user.activeDevices.push({
      deviceId,
      lastLogin: new Date(),
      deviceInfo: req.headers['user-agent']
    });

    await user.save();
    next();
  } catch (error) {
    console.error("Device limit check error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while checking device limit" 
    });
  }
};

module.exports = checkDeviceLimit; 