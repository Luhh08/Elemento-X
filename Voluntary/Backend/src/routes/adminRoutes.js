const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const authAdmin = require('../middlewares/authAdmin');
const { sendAdminNotice, tplBanimento, tplDesbanimento } = require('../utils/mailBan');

const prisma = new PrismaClient();
const router = express.Router();

async function fetchAdminFeedback(limit = 200) {
  const feedbackRaw = await prisma.avaliacao.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      vaga: {
        select: {
          id: true,
          titulo: true,
          empresa: { select: { id: true, razao_social: true } }
        }
      },
      voluntario: { select: { id: true, nome: true, usuario: true, email: true } }
    }
  });

  return feedbackRaw.map(f => ({
    id: f.id,
    nota: f.nota,
    comentario: f.comentario ?? '',
    fotos: f.fotos ?? [],
    criadoEm: f.createdAt,
    vaga: f.vaga
      ? {
          id: f.vaga.id,
          titulo: f.vaga.titulo,
          empresa: f.vaga.empresa
            ? { id: f.vaga.empresa.id, nome: f.vaga.empresa.razao_social }
            : null
        }
      : null,
    voluntario: f.voluntario
      ? {
          id: f.voluntario.id,
          nome: f.voluntario.nome,
          usuario: f.voluntario.usuario,
          email: f.voluntario.email
        }
      : null
  }));
}

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

    const denunciasRaw = await prisma.denuncia.findMany({
      orderBy: { criadoEm: 'desc' },
      take: 200,
      include: {
        quemDenunciou: { select: { id: true, nome: true, usuario: true, email: true } },
        quemDenunciouEmpresa: { select: { id: true, razao_social: true, usuario: true, email: true } }
      }
    });

    const idsUsuarios = new Set();
    const idsEmpresas = new Set();
    const idsVagas = new Set();
    denunciasRaw.forEach(d => {
      if (d.tipo === 'usuario') idsUsuarios.add(d.alvoId);
      else if (d.tipo === 'empresa') idsEmpresas.add(d.alvoId);
      else if (d.tipo === 'vaga') idsVagas.add(d.alvoId);
    });

    const [alvosUsuarios, alvosEmpresas, alvosVagas] = await Promise.all([
      idsUsuarios.size ? prisma.usuario.findMany({
        where: { id: { in: Array.from(idsUsuarios) } },
        select: { id: true, nome: true, usuario: true, email: true }
      }) : [],
      idsEmpresas.size ? prisma.empresa.findMany({
        where: { id: { in: Array.from(idsEmpresas) } },
        select: { id: true, razao_social: true, usuario: true, email: true }
      }) : [],
      idsVagas.size ? prisma.vaga.findMany({
        where: { id: { in: Array.from(idsVagas) } },
        select: {
          id: true,
          titulo: true,
          status: true,
          empresa: { select: { id: true, razao_social: true } }
        }
      }) : []
    ]);

    const mapUsuarios = new Map(alvosUsuarios.map(u => [u.id, u]));
    const mapEmpresas = new Map(alvosEmpresas.map(e => [e.id, e]));
    const mapVagas = new Map(alvosVagas.map(v => [v.id, v]));

    const denuncias = denunciasRaw.map(d => {
      let alvo = null;
      if (d.tipo === 'usuario') {
        const target = mapUsuarios.get(d.alvoId);
        if (target) {
          alvo = {
            id: target.id,
            nome: target.nome || target.usuario || 'Usuário',
            email: target.email,
            usuario: target.usuario || null
          };
        }
      } else if (d.tipo === 'empresa') {
        const target = mapEmpresas.get(d.alvoId);
        if (target) {
          alvo = {
            id: target.id,
            nome: target.razao_social || target.usuario || 'Empresa',
            email: target.email,
            usuario: target.usuario || null
          };
        }
      } else if (d.tipo === 'vaga') {
          const target = mapVagas.get(d.alvoId);
          if (target) {
            alvo = {
              id: target.id,
              nome: target.titulo || 'Vaga',
              status: target.status,
              empresaNome: target.empresa?.razao_social || '—'
            };
          }
      }
      let reporter = d.quemDenunciou || null;
      if (!reporter && d.quemDenunciouEmpresa) {
        reporter = {
          id: d.quemDenunciouEmpresa.id,
          nome: d.quemDenunciouEmpresa.razao_social || d.quemDenunciouEmpresa.usuario || "Empresa",
          usuario: d.quemDenunciouEmpresa.usuario || null,
          email: d.quemDenunciouEmpresa.email || null,
          tipo: "empresa"
        };
      }
      if (!reporter && (d.reporterNome || d.reporterEmail)) {
        reporter = {
          id: null,
          nome: d.reporterNome || d.reporterEmail || "Denunciante",
          usuario: null,
          email: d.reporterEmail || null,
          tipo: d.reporterTipo || null
        };
      }
      return { ...d, alvo, quemDenunciou: reporter };
    });

    const feedback = await fetchAdminFeedback();

    res.json({ usuarios, empresas, vagas, denuncias, feedback });
  } catch (err) {
    console.error('[admin/dados] erro:', err);
    res.status(500).json({ error: 'Erro ao carregar dados.' });
  }
});

router.get('/feedback', authAdmin, async (_req, res) => {
  try {
    const feedback = await fetchAdminFeedback();
    res.json({ feedback });
  } catch (err) {
    console.error('[admin/feedback] erro:', err);
    res.status(500).json({ error: 'Erro ao carregar feedbacks.' });
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
      await prisma.denuncia.delete({ where: { id } });
      return res.json({ message: 'Denúncia removida' });
    }
    if (tipo === 'feedback') {
      await prisma.avaliacao.delete({ where: { id } });
      return res.json({ message: 'Feedback removido' });
    }
    return res.status(400).json({ error: 'Tipo inválido para remoção.' });
  } catch (err) {
    console.error('[admin/remover] erro:', err);
    res.status(500).json({ error: 'Erro ao remover.' });
  }
});

module.exports = router;
