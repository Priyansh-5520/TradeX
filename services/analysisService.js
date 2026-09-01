const cron = require("node-cron");
const User = require("../models/User");
const Analysis = require("../models/Analysis");
const holdingService = require("./holdingService");

/**
 * Runs a daily snapshot of every user's total portfolio value.
 * This runs automatically at midnight (00:00) every day.
 */
const startDailySnapshotJob = () => {
  // "0 0 * * *" = Run at 00:00 (midnight) every day
  cron.schedule("0 0 * * *", async () => {
    console.log("📊 Running daily Analysis snapshot for all users...");
    
    try {
      const users = await User.find({});
      
      for (const user of users) {
        try {
          // Get live portfolio valuation
          const portfolio = await holdingService.getPortfolio(user._id);
          
          // Total Net Worth = Cash + Live Stock Value
          const totalNetWorth = user.virtualCash + portfolio.summary.totalCurrentValue;
          
          // Create Analysis record
          await Analysis.create({
            userId: user._id,
            portfolioValue: totalNetWorth,
            date: new Date()
          });
        } catch (err) {
          console.error(`Failed to snapshot analysis for user ${user._id}:`, err.message);
        }
      }
      
      console.log("✅ Daily Analysis snapshot completed.");
    } catch (error) {
      console.error("❌ Fatal error running daily snapshot:", error.message);
    }
  });
  
  console.log("🕒 Daily Analysis snapshot cron job initialized (runs at midnight).");
};

module.exports = {
  startDailySnapshotJob
};
