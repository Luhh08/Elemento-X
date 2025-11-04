const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const authAdmin = require('../middlewares/authAdmin');

const prisma = new PrismaClient();
const router = express.Router();

/* ===========================
   LOGIN (mantenha o seu)
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
   (Usuarios, Empresas, Vagas)
=========================== */
router.get('/dados', authAdmin, async (_req, res) => {
  try {
    // usuarios (mapeia campos pro que o front espera)
    const usuariosRaw = await prisma.usuario.findMany({
      select: {
        id: true, nome: true, usuario: true, email: true,
        descricao: true, bannerUrl: true, fotoUrl: true,
        competencias: true, preferenciaHorario: true, emailcontato: true, telefonecontato: true,
        validacao: true,
      }
    });
    const usuarios = usuariosRaw.map(u => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      usuario: u.usuario,
      status: u.validacao ? 'ativo' : 'pendente',
      descricao: u.descricao ?? null,
      fotoUrl: u.fotoUrl ?? null,
      bannerUrl: u.bannerUrl ?? null,
      competencias: u.competencias ?? [],
      preferenciaHorario: u.preferenciaHorario ?? [],
      emailcontato: u.emailcontato ?? null,
      telefonecontato: u.telefonecontato ?? null,
    }));

    // empresas + contagem de vagas
    const empresasRaw = await prisma.empresa.findMany({
      select: {
        id: true, razao_social: true, email: true, usuario: true, descricao: true,
        logoUrl: true, bannerUrl: true, validacao: true,
        _count: { select: { vaga: true } }
      }
    });
    const empresas = empresasRaw.map(e => ({
      id: e.id,
      nome: e.razao_social,           // front usa "nome"
      email: e.email,
      usuario: e.usuario ?? null,
      descricao: e.descricao ?? null,
      logoUrl: e.logoUrl ?? null,
      bannerUrl: e.bannerUrl ?? null,
      vagasAtivas: e._count?.vaga ?? 0,
      status: e.validacao ? 'ativo' : 'pendente',
    }));

    // vagas (inclui empresa p/ exibir nome)
    const vagasRaw = await prisma.vaga.findMany({
      include: { empresa: { select: { razao_social: true } } }
    });
    const vagas = vagasRaw.map(v => ({
      id: v.id,
      titulo: v.titulo,
      empresaNome: v.empresa?.razao_social ?? '—',
      status: v.status,           // ABERTA / ANDAMENTO / etc.
      dataInicio: v.dataInicio ?? null,
      dataFim: v.dataFim ?? null,
      candidaturas: v.aplicacoes ?? 0, // você guarda contagem em 'aplicacoes'
      tags: v.tags ?? [],
      turno: v.turno ?? [],
      local: v.local ?? null,
    }));

    // como ainda não há modelos:
    const denuncias = [];
    const feedback  = [];

    console.log('[admin/dados] =>', {
      usuarios: usuarios.length, empresas: empresas.length, vagas: vagas.length
    });

    res.json({ usuarios, empresas, vagas, denuncias, feedback });
  } catch (err) {
    console.error('[admin/dados] erro:', err);
    res.status(500).json({ error: 'Erro ao carregar dados.' });
  }
});

/* ===========================
   BANIR / REMOVER (delete)
=========================== */
router.delete('/banir/:tipo/:id', authAdmin, async (req, res) => {
  const { tipo, id } = req.params;
  try {
    if (tipo === 'usuario') {
      await prisma.usuario.delete({ where: { id } });
    } else if (tipo === 'empresa') {
      // ⚠️ Atenção: sua relação Vaga→Empresa usa onDelete: Cascade
      // então deletar empresa apaga as vagas da empresa.
      await prisma.empresa.delete({ where: { id } });
    } else if (tipo === 'vaga') {
      await prisma.vaga.delete({ where: { id } });
    } else {
      return res.status(400).json({ error: 'Tipo inválido para banimento.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin/banir] erro:', err);
    res.status(500).json({ error: 'Erro ao banir/remover.' });
  }
});

module.exports = router;
