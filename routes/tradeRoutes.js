const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");
const { protect } = require("../middleware/auth");

router.post("/buy", protect, tradeController.buyStock);
router.post("/sell", protect, tradeController.sellStock);

module.exports = router;
