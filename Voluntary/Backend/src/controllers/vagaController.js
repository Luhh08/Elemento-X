const { PrismaClient } = require("@prisma/client");
const path = require("path");
const { registrarNotificacao } = require("../utils/notificacaoService");
const prisma = new PrismaClient();

async function listarVagasPublicas(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const pageSize = Math.max(1, parseInt(req.query.pageSize ?? '9', 10));
    const { empresaId, tag, q } = req.query;

    const where = {};
    if (empresaId) where.empresaId = String(empresaId);
    if (tag) where.tags = { has: String(tag) };
    if (q) {
      where.OR = [
        { titulo: { contains: String(q), mode: 'insensitive' } },
        { descricao: { contains: String(q), mode: 'insensitive' } },
        { tags: { has: String(q) } },
      ];
    }

const [vagas, total] = await Promise.all([
  prisma.vaga.findMany({
    where,
    orderBy: { id: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      empresaId: true,
      titulo: true,
      descricao: true,
      tags: true,
      local: true,
      turno: true,
      status: true,
      dataInicio: true,
      dataFim: true,
      imagens: true, // <<< AQUI
      empresa: {
        select: { id: true, usuario: true, razao_social: true, logoUrl: true }
      }
    }
  }),
  prisma.vaga.count({ where }),
]);

const vagasComResumo = vagas.map(v => ({
  ...v,
  resumo: v.descricao?.length > 20 ? v.descricao.slice(0,20) + '…' : v.descricao
}));
res.json({ items: vagasComResumo, total, page, pageSize });

  } catch (error) {
    console.error("Erro ao listar vagas:", error);
    res.status(500).json({ error: "Erro interno ao listar vagas." });
  }
}


async function getVaga(req, res, next) {
  try {
    const { id } = req.params;
    const vaga = await prisma.vaga.findUnique({
      where: { id },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        local: true,
        status: true,
        tags: true,
        turno: true,
        dataInicio: true,
        dataFim: true,
        imagens: true, // <<< AQUI
        empresaId: true,
        empresa: { select: { id: true, razao_social: true, logoUrl: true } }
      }
    });
    if (!vaga) return res.status(404).json({ error: "Vaga não encontrada" });
    res.json(vaga);
  } catch (e) { next(e); }
}

async function atualizarVaga(req, res, next) {
  try {
    const { id } = req.params;
    const empresaId =
      req.user?.empresaId ||
      (req.user?.tipo === "empresa" ? req.user?.id : null);
    if (!empresaId) {
      return res.status(403).json({ error: "Apenas empresas podem atualizar vagas." });
    }

    const vagaAtual = await prisma.vaga.findUnique({
      where: { id },
      select: {
        id: true,
        empresaId: true,
        status: true,
        titulo: true,
        empresa: { select: { email: true, emailcontato: true } },
      }
    });
    if (!vagaAtual) return res.status(404).json({ error: "Vaga não encontrada" });
    if (String(vagaAtual.empresaId) !== String(empresaId)) {
      return res.status(403).json({ error: "Você não pode editar esta vaga." });
    }

    const {
      titulo = "",
      descricao = "",
      local = "",
      status = "ABERTA",
      dataInicio,
      dataFim,
    } = req.body;

    const toArray = (v) => []
      .concat(v || [])
      .flat()
      .map((x) => String(x).trim())
      .filter(Boolean);

    const tags   = toArray(req.body.tags);
    const turnos = toArray(req.body.turno);
    const dtInicio = dataInicio ? new Date(dataInicio) : null;
    const dtFim    = dataFim    ? new Date(dataFim)    : null;
    const imagensExistentes = toArray(req.body.imagens_existentes);
    const novasImagens = (req.files || []).map((f) => {
      return "/" + path.join("uploads", path.basename(f.path)).replace(/\\/g, "/");
    });

    const imagensFinal = [...imagensExistentes, ...novasImagens];

    const novoStatus = String(status || "ABERTA").trim().toUpperCase();
    const statusAnterior = String(vagaAtual.status || "").trim().toUpperCase();
    const contatoEmpresa =
      vagaAtual?.empresa?.emailcontato ||
      vagaAtual?.empresa?.email ||
      "o e-mail informado pela empresa";

    const updated = await prisma.vaga.update({
      where: { id },
      data: {
        titulo,
        descricao,
        local,
        status: novoStatus,
        tags,
        turno: turnos,       
        dataInicio: dtInicio,
        dataFim: dtFim,
        imagens: imagensFinal,
      },
      select: { id: true, status: true, titulo: true },
    });

    // Notificar voluntários quando a vaga mudar para ANDAMENTO
    if (statusAnterior !== "ANDAMENTO" && novoStatus === "ANDAMENTO") {
      try {
        const candidaturas = await prisma.candidatura.findMany({
          where: { vagaId: id },
          select: { voluntarioId: true },
        });
        const dedupe = new Set();
        const notifications = [];
        for (const c of candidaturas) {
          if (!c.voluntarioId) continue;
          const key = c.voluntarioId;
          if (dedupe.has(key)) continue;
          dedupe.add(key);
          notifications.push({
            titulo: "Vaga em andamento",
            mensagem: `A vaga "${vagaAtual.titulo || updated.titulo || "Vaga"}" iniciou, fique atento sobre horário e local de participação. Para dúvidas, envie um e-mail para ${contatoEmpresa}.`,
            categoria: "VAGA",
            link: `/descricao_vagas.html?id=${encodeURIComponent(id)}`,
            usuarioId: c.voluntarioId,
          });
        }
        if (notifications.length) {
          for (const n of notifications) {
            await registrarNotificacao(n);
          }
        }
      } catch (notifyErr) {
        console.error("Falha ao notificar voluntários sobre vaga em andamento:", notifyErr);
      }
    }

    // Notificar voluntários quando a vaga for FINALIZADA
    if (statusAnterior !== "FINALIZADA" && novoStatus === "FINALIZADA") {
      try {
        const candidaturas = await prisma.candidatura.findMany({
          where: { vagaId: id },
          select: { voluntarioId: true },
        });
        const dedupe = new Set();
        const notifications = [];
        for (const c of candidaturas) {
          if (!c.voluntarioId) continue;
          const key = c.voluntarioId;
          if (dedupe.has(key)) continue;
          dedupe.add(key);
          notifications.push({
            titulo: "Vaga finalizada",
            mensagem: `A vaga "${vagaAtual.titulo || updated.titulo || "Vaga"}" foi encerrada, muito obrigado por sua participação.`,
            categoria: "VAGA",
            link: `/descricao_vagas.html?id=${encodeURIComponent(id)}`,
            usuarioId: c.voluntarioId,
          });
        }
        if (notifications.length) {
          for (const n of notifications) {
            await registrarNotificacao(n);
          }
        }
      } catch (notifyErr) {
        console.error("Falha ao notificar voluntários sobre vaga finalizada:", notifyErr);
      }
    }

    res.json(updated);
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Vaga não encontrada" });
    }
    next(e);
  }
}

async function listarTagsDoSistema(req, res) {
  try {
    const [vagaTagsDocs, vagaTurnosDocs, empresaTagsDocs] = await Promise.all([
      prisma.vaga.findMany({ select: { tags: true } }),
      prisma.vaga.findMany({ select: { turno: true } }),
      prisma.empresa.findMany({ select: { tags: true } })
    ]);

    const lowerToOrig = new Map();

    const addMany = (arr) => {
      for (const v of arr || []) {
        if (!v) continue;
        const s = String(v).trim();
        if (!s) continue;
        const key = s.toLowerCase();
        if (!lowerToOrig.has(key)) lowerToOrig.set(key, s);
      }
    };

    vagaTagsDocs.forEach(d => addMany(d.tags));
    vagaTurnosDocs.forEach(d => addMany(d.turno));
    empresaTagsDocs.forEach(d => addMany(d.tags));

    const all = Array.from(lowerToOrig.values())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    const TURNOS_CANON = new Set(['manhã','tarde','noite',]);
    const turnos = all.filter(x => TURNOS_CANON.has(x.toLowerCase()));
    const tags   = all.filter(x => !TURNOS_CANON.has(x.toLowerCase()));

    res.json({ tags, turnos, all });
  } catch (e) {
    console.error('Erro ao listar tags:', e);
    res.status(500).json({ error: 'Erro ao listar tags' });
  }
}

async function deletarVaga(req, res, next) {
  try {
    const { id } = req.params;
    const empresaId =
      req.user?.empresaId ||
      (req.user?.tipo === "empresa" ? req.user?.id : null);
    if (!empresaId) {
      return res.status(403).json({ error: "Apenas empresas podem excluir vagas." });
    }

    const vaga = await prisma.vaga.findUnique({
      where: { id },
      select: { id: true, empresaId: true }
    });
    if (!vaga) return res.status(404).json({ error: "Vaga não encontrada." });
    if (String(vaga.empresaId) !== String(empresaId)) {
      return res.status(403).json({ error: "Você não pode excluir esta vaga." });
    }

    await prisma.candidatura.deleteMany({ where: { vagaId: id } });
    await prisma.vaga.delete({ where: { id } });
    res.json({ message: "Vaga excluída com sucesso." });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarVagasPublicas,
  getVaga,
  atualizarVaga,
  deletarVaga,
  listarTagsDoSistema,
};
