const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");
const { protect } = require("../middleware/auth");

router.get("/", protect, tradeController.getTransactions);

module.exports = router;
