const express = require("express");
const { protect } = require("../middleware/auth");
const controller = require("../controllers/watchlistController");
const router = express.Router();

router.use(protect);
router.get("/", controller.getWatchlist);
router.post("/", controller.addSymbol);
router.put("/", controller.reorderWatchlist);
router.delete("/:symbol", controller.removeSymbol);

module.exports = router;
