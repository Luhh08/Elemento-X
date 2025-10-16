const express = require('express');
const router = express.Router();

// Importa o controller que faz a mágica acontecer
const { verifyEmail } = require('../controllers/verifyController');

// Define a rota GET para /verify-email
// Quando alguém acessar essa rota, a função verifyEmail será chamada
router.get('/verify-email', verifyEmail);

module.exports = router;