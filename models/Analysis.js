const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Analysis date is required"],
      default: Date.now,
    },
    portfolioValue: {
      type: Number,
      required: [true, "Portfolio value is required"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Analysis = mongoose.model("Analysis", analysisSchema);

module.exports = Analysis;
