const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: [true, "Stock symbol is required"],
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
    },
    type: {
      type: String,
      required: [true, "Type is required"],
      enum: ["BUY", "SELL"],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;