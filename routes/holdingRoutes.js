const express = require("express");
const router = express.Router();
const holdingController = require("../controllers/holdingController");
const { protect } = require("../middleware/auth");

router.get("/", protect, holdingController.getPortfolio);

module.exports = router;
