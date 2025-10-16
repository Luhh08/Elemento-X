const express = require("express");
const router = express.Router();

const userRoutes = require("./userRoutes");
const empresaRoutes = require("./empresaRoutes");

router.use(userRoutes);
router.use(empresaRoutes);

module.exports = router;
