const express = require("express");
const router = express.Router();
const stockController = require("../controllers/stockController");

router.get("/quote/:symbol", stockController.getQuote);
router.get("/search", stockController.searchStocks);
router.get("/history/:symbol", stockController.getHistory);

module.exports = router;
