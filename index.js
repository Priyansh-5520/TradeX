const mongoose = require("mongoose");
const { User, Transaction, Holding, Analysis } = require("./models");

mongoose.connect("mongodb+srv://priyansh2805_db_user:test1234@cluster0.5vmnkju.mongodb.net/TradeX?appName=Cluster0")
    .then(async () => {
        console.log("MongoDB Connected.");
        console.log("Models registered:", Object.keys(mongoose.models).join(", "));

        try {
          const newUser = await User.create({
            userName: "Jon Doe",
            watchlist: ["AAPL", "TSLA"] 
          });

          console.log("User Account Created Successfully:\n", newUser);
        } catch (error) {
          console.error("Error creating user:", error.message);
        } finally {
          mongoose.connection.close(); // Close connection after test
        }
    })
    .catch((error) => {
        console.error("Error Connecting to MongoDB:", error.message);
    });