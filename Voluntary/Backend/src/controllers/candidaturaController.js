const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function criarCandidatura(req, res, next) {
  try {
    const { vagaId } = req.body;
    const voluntarioId = req.user?.id;

    if (!voluntarioId) return res.status(401).json({ error: "Não autenticado." });
    if (!vagaId) return res.status(400).json({ error: "vagaId é obrigatório." });

    const vaga = await prisma.vaga.findUnique({
      where: { id: vagaId },
      select: { id: true, status: true }
    });
    if (!vaga) return res.status(404).json({ error: "Vaga não encontrada." });

    if (vaga.status && vaga.status !== "ABERTA") {
      return res.status(400).json({ error: "Inscrições não estão abertas para esta vaga." });
    }

    const existente = await prisma.candidatura.findUnique({
      where: { vagaId_voluntarioId: { vagaId, voluntarioId } }
    });
    if (existente) {
      return res.status(409).json({ error: "Você já se candidatou a esta vaga." });
    }

    const nova = await prisma.candidatura.create({
      data: { vagaId, voluntarioId } 
    });

    res.status(201).json({ message: "Candidatura criada!", candidatura: nova });
  } catch (err) {
    next(err);
  }
}

async function listarCandidaturas(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(req.query.pageSize, 10) || 6));
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const userId = req.user?.id || null;
    const empresaId =
      req.user?.empresaId ||
      req.user?.empresa?.id ||
      (req.user?.tipo === "empresa" ? req.user?.id : null) ||
      null;

    let where = {};
    let include = {};

    if (empresaId) {
      const vagas = await prisma.vaga.findMany({
        where: { empresaId: empresaId },
        select: { id: true }
      });
      const vagaIds = vagas.map(v => v.id);
      if (!vagaIds.length) {
        return res.json({ items: [], total: 0, page, pageSize });
      }
      where = { vagaId: { in: vagaIds } };
      include = {
        voluntario: {
          select: {
            id: true,
            nome: true,
            usuario: true,
            email: true,
            emailcontato: true,
            telefonecontato: true,
            competencias: true,
            fotoUrl: true,
            preferenciaHorario: true
          }
        },
        vaga: { select: { id: true, titulo: true, status: true, empresaId: true } }
      };
    } else if (userId) {
      where = { voluntarioId: userId };
      include = {
        vaga: { select: { id: true, titulo: true, status: true, empresaId: true } }
      };
    } else {
      return res.status(401).json({ error: "Não autenticado." });
    }

    const [items, total] = await Promise.all([
      prisma.candidatura.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip,
        take
      }),
      prisma.candidatura.count({ where })
    ]);

    res.json({ items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
}

async function listarCandidaturasDaVaga(req, res, next) {
  try {
    const { vagaId } = req.params;
    if (!vagaId) return res.status(400).json({ error: "vagaId é obrigatório." });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(req.query.pageSize, 10) || 6));
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [items, total] = await Promise.all([
      prisma.candidatura.findMany({
        where: { vagaId },
        orderBy: { createdAt: "desc" },
        include: {
          voluntario: {
            select: {
              id: true,
              nome: true,
              usuario: true,
              email: true,
              emailcontato: true,
              telefonecontato: true,
              competencias: true,
              fotoUrl: true,
              preferenciaHorario: true
            }
          }
        },
        skip,
        take
      }),
      prisma.candidatura.count({ where: { vagaId } })
    ]);

    res.json({ items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
}

async function atualizarStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = ["ACEITA", "RECUSADA", "PENDENTE"];
    if (!valid.includes(String(status || ""))) {
      return res.status(400).json({ error: "Status inválido." });
    }

    const up = await prisma.candidatura.update({
      where: { id },
      data: { status }
    });

    res.json({ message: "Status atualizado.", candidatura: up });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  criarCandidatura,
  listarCandidaturas,
  listarCandidaturasDaVaga,
  atualizarStatus,
};
