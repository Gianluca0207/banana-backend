const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // 🔥 Nuovi campi per gestione abbonamento e trial:
    isTrial: {
      type: Boolean,
      default: true,
    },
    trialEndsAt: {
      type: Date,
    },
    isSubscribed: {
      type: Boolean,
      default: false,
    },
    subscriptionPlan: {
      type: String,
      enum: ['monthly', 'semiannual', 'annual'],
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    },
    stripeCustomerId: {
      type: String,
    },

    // 🔐 Campi per gestione dispositivi
    activeDevices: [{
      deviceId: String,
      lastLogin: Date,
      deviceInfo: String
    }],
    maxDevices: {
      type: Number,
      default: 2
    }
  },
  { timestamps: true }
);

// 📌 Hash password prima di salvare
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;
