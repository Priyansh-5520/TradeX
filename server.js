require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ Failed to connect MongoDB: ${err.message}`);
    process.exit(1);
  }
};

connectDB();