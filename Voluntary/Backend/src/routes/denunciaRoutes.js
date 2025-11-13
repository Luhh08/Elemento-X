const express = require('express');
const router = express.Router();
const authAdmin = require('../middlewares/authAdmin');
const { criarDenuncia, listarDenuncias, removerDenuncia, resolverDenuncia } = require('../controllers/denunciaController');

// Allow anonymous users to submit denúncias (no auth middleware)
router.post('/', criarDenuncia);
router.get('/', authAdmin, listarDenuncias);
router.delete('/:id', authAdmin, removerDenuncia);
router.patch('/:id/resolver', authAdmin, resolverDenuncia);

module.exports = router;
