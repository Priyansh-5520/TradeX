const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
    },
    virtualCash: {
      type: Number,
      required: true,
      default: 100000,
    },
    watchlist: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User",userSchema);

module.exports = User;