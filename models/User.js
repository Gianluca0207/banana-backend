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
    // Campo per gestire dispositivo unico
    deviceToken: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// 📌 Hash password prima di salvare
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
