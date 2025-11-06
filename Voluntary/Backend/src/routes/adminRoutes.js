const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const authAdmin = require('../middlewares/authAdmin');
const { sendAdminNotice, tplBanimento, tplDesbanimento } = require('../utils/mailBan');

const prisma = new PrismaClient();
const router = express.Router();

/* ===========================
   LOGIN
=========================== */
router.post('/login', async (req, res) => {
  try {
    let { usuario, senha } = req.body;
    if (!usuario || !senha) return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });

    const admin = await prisma.administrador.findFirst({
      where: { usuario: { equals: String(usuario).trim(), mode: 'insensitive' } }
    });
    if (!admin) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const ok = await bcrypt.compare(String(senha), admin.senhaHash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const token = jwt.sign(
      { sub: admin.id, role: 'admin', usuario: admin.usuario },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '2h' }
    );
    res.json({ token });
  } catch (err) {
    console.error('[admin login]', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

/* ===========================
   DADOS DO PAINEL
=========================== */
router.get('/dados', authAdmin, async (_req, res) => {
  try {
    // usuários
    const usuariosRaw = await prisma.usuario.findMany({
      select: {
        id: true, nome: true, usuario: true, email: true,
        descricao: true, bannerUrl: true, fotoUrl: true,
        competencias: true, preferenciaHorario: true, emailcontato: true, telefonecontato: true,
        validacao: true,
        isBanned: true, banReason: true
      }
    });
    const usuarios = usuariosRaw.map(u => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      usuario: u.usuario,
      status: u.validacao ? 'ativo' : 'pendente',
      validacao: u.validacao,
      isBanned: !!u.isBanned,
      banReason: u.banReason ?? null,
      descricao: u.descricao ?? null,
      fotoUrl: u.fotoUrl ?? null,
      bannerUrl: u.bannerUrl ?? null,
      competencias: u.competencias ?? [],
      preferenciaHorario: u.preferenciaHorario ?? [],
      emailcontato: u.emailcontato ?? null,
      telefonecontato: u.telefonecontato ?? null,
    }));

    // empresas
    const empresasRaw = await prisma.empresa.findMany({
      select: {
        id: true, razao_social: true, email: true, usuario: true, descricao: true,
        logoUrl: true, bannerUrl: true, validacao: true,
        isBanned: true, banReason: true,
        _count: { select: { vaga: true } }
      }
    });
    const empresas = empresasRaw.map(e => ({
      id: e.id,
      nome: e.razao_social,
      email: e.email,
      usuario: e.usuario ?? null,
      descricao: e.descricao ?? null,
      logoUrl: e.logoUrl ?? null,
      bannerUrl: e.bannerUrl ?? null,
      vagasAtivas: e._count?.vaga ?? 0,
      status: e.validacao ? 'ativo' : 'pendente',
      validacao: e.validacao,
      isBanned: !!e.isBanned,
      banReason: e.banReason ?? null,
    }));

    // vagas
    const vagasRaw = await prisma.vaga.findMany({
      include: { empresa: { select: { razao_social: true, email: true } } }
    });
    const vagas = vagasRaw.map(v => ({
      id: v.id,
      titulo: v.titulo,
      empresaNome: v.empresa?.razao_social ?? '—',
      status: v.status,
      dataInicio: v.dataInicio ?? null,
      dataFim: v.dataFim ?? null,
      candidaturas: v.aplicacoes ?? 0,
      tags: v.tags ?? [],
      turno: v.turno ?? [],
      local: v.local ?? null,
      isBanned: !!v.isBanned,
      banReason: v.banReason ?? null,
    }));

    const denuncias = [];
    const feedback  = [];

    res.json({ usuarios, empresas, vagas, denuncias, feedback });
  } catch (err) {
    console.error('[admin/dados] erro:', err);
    res.status(500).json({ error: 'Erro ao carregar dados.' });
  }
});

/* ===========================
   BANIR (soft-ban) + e-mail
   POST /api/admin/banir/:tipo/:id
   body: { reason?: string }
=========================== */
router.post('/banir/:tipo/:id', authAdmin, async (req, res) => {
  const { tipo, id } = req.params;
  const banReason = String(req.body?.reason || 'Violação das regras').slice(0, 500);

  try {
    if (tipo === 'usuario') {
      const u = await prisma.usuario.update({
        where: { id },
        data: { isBanned: true, banReason }
      });
      await sendAdminNotice(
        u.email,
        'Sua conta foi banida',
        tplBanimento({ nome: u.nome || u.usuario, motivo: banReason })
      );
    } else if (tipo === 'empresa') {
      const e = await prisma.empresa.update({
        where: { id },
        data: { isBanned: true, banReason }
      });
      await sendAdminNotice(
        e.email,
        'Sua conta foi banida',
        tplBanimento({ nome: e.razao_social || e.usuario, motivo: banReason })
      );
      // (opcional) banir vagas da empresa:
      // await prisma.vaga.updateMany({ where: { empresaId: id }, data: { isBanned: true, banReason: 'Conta da empresa banida' }});
    } else if (tipo === 'vaga') {
      await prisma.vaga.update({
        where: { id },
        data: { isBanned: true, banReason }
      });
    } else {
      return res.status(400).json({ error: 'Tipo inválido para banimento.' });
    }

    res.json({ message: 'Registro banido com sucesso.' });
  } catch (err) {
    console.error('[admin/banir] erro:', err);
    res.status(500).json({ error: 'Erro ao banir.' });
  }
});

/* ===========================
   DESBANIR + e-mail
   POST /api/admin/desbanir/:tipo/:id
=========================== */
router.post('/desbanir/:tipo/:id', authAdmin, async (req, res) => {
  const { tipo, id } = req.params;

  try {
    if (tipo === 'usuario') {
      const u = await prisma.usuario.update({
        where: { id },
        data: { isBanned: false, banReason: null }
      });
      await sendAdminNotice(
        u.email,
        'Sua conta foi reativada',
        tplDesbanimento({ nome: u.nome || u.usuario })
      );
    } else if (tipo === 'empresa') {
      const e = await prisma.empresa.update({
        where: { id },
        data: { isBanned: false, banReason: null }
      });
      // (opcional) desbanir vagas:
      // await prisma.vaga.updateMany({ where: { empresaId: id }, data: { isBanned: false, banReason: null }});
      await sendAdminNotice(
        e.email,
        'Sua conta foi reativada',
        tplDesbanimento({ nome: e.razao_social || e.usuario })
      );
    } else if (tipo === 'vaga') {
      await prisma.vaga.update({
        where: { id },
        data: { isBanned: false, banReason: null }
      });
    } else {
      return res.status(400).json({ error: 'Tipo inválido para desbanir.' });
    }

    res.json({ message: 'Registro desbanido.' });
  } catch (err) {
    console.error('[admin/desbanir] erro:', err);
    res.status(500).json({ error: 'Erro ao desbanir.' });
  }
});

/* ===========================
   REMOVER denúncia/feedback
=========================== */
router.delete('/banir/:tipo/:id', authAdmin, async (req, res) => {
  const { tipo, id } = req.params;
  try {
    if (tipo === 'denuncia') {
      // await prisma.denuncia.delete({ where: { id } });
      return res.json({ message: 'Denúncia removida (placeholder)' });
    }
    if (tipo === 'feedback') {
      // await prisma.feedback.delete({ where: { id } });
      return res.json({ message: 'Feedback removido (placeholder)' });
    }
    return res.status(400).json({ error: 'Tipo inválido para remoção.' });
  } catch (err) {
    console.error('[admin/remover] erro:', err);
    res.status(500).json({ error: 'Erro ao remover.' });
  }
});

module.exports = router;
