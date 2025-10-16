const express = require("express");
const router = express.Router();
const { loginEmpresa } = require("../controllers/empresaController");

router.post("/login-empresa", loginEmpresa);

module.exports = router;
