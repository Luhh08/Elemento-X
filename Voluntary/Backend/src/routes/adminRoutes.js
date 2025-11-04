const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// === LOGIN DO ADMIN ===
router.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    if (!usuario || !senha) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    const admin = await prisma.administrador.findUnique({ where: { usuario } });
    if (!admin) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const ok = await bcrypt.compare(senha, admin.senhaHash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const token = jwt.sign(
      { sub: admin.id, role: 'admin', usuario: admin.usuario },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.json({ token });
  } catch (err) {
    console.error('[admin login]', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

module.exports = router;