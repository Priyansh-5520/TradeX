const express = require("express");
const router = express.Router();
const analysisController = require("../controllers/analysisController");

router.get("/:userId", analysisController.getTransactions);

module.exports = router;
