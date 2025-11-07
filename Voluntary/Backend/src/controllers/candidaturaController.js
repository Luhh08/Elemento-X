const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PAGE_DEFAULT = 1;
const PAGE_SIZE_DEFAULT = 6;

const toObjId = (v) => String(v);

function mapItem(c) {
  const v = c.voluntario || {};
  const vaga = c.vaga || {};
  return {
    id: c.id,
    status: c.status,
    voluntario: {
      id: v.id,
      nome: v.nome,
      emailcontato: v.emailcontato || v.email || null,
      telefonecontato: v.telefonecontato || null,
      competencias: v.competencias || [],
      preferenciaHorario: v.preferenciaHorario || [],
      fotoUrl: v.fotoUrl || null,
    },
    vaga: {
      id: vaga.id,
      titulo: vaga.titulo || vaga.nome || "Vaga",
    },
  };
}

exports.criar = async (req, res, next) => {
  try {
    const { vagaId } = req.body;
    const user = req.user; // vindo do autenticarToken
    if (!vagaId || !user?.id) return res.status(400).json({ error: "vagaId obrigatório." });

    const created = await prisma.candidatura.create({
      data: {
        vagaId: toObjId(vagaId),
        voluntarioId: toObjId(user.id),
      },
      include: { voluntario: true, vaga: true },
    });

    res.status(201).json(mapItem(created));
  } catch (err) {
    if (String(err.message).includes("Unique constraint")) {
      return res.status(409).json({ error: "Candidatura já existente para esta vaga." });
    }
    next(err);
  }
};

exports.listar = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || PAGE_DEFAULT));
    const pageSize = Math.max(1, parseInt(req.query.pageSize || PAGE_SIZE_DEFAULT));
    const q = (req.query.q || "").toLowerCase();

    const where = {}; // ajuste se quiser filtrar por status / vaga / empresa

    const [total, rows] = await Promise.all([
      prisma.candidatura.count({ where }),
      prisma.candidatura.findMany({
        where,
        include: {
          voluntario: true,
          vaga: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let items = rows;
    if (q) {
      items = rows.filter((c) => {
        const v = c.voluntario || {};
        const hay = [
          v.nome,
          v.emailcontato || v.email,
          ...(v.competencias || []),
          c.vaga?.titulo || c.vaga?.nome,
        ]
          .join(" | ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    res.json({
      page,
      pageSize,
      total,
      items: items.map(mapItem),
    });
  } catch (err) {
    next(err);
  }
};

exports.atualizarStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status } = req.body;
    const allow = ["INSCRITA", "ACEITA", "RECUSADA", "EM_ANDAMENTO"];
    status = String(status || "").toUpperCase();
    if (!allow.includes(status)) return res.status(400).json({ error: "Status inválido." });

    const up = await prisma.candidatura.update({
      where: { id },
      data: { status },
      include: { voluntario: true, vaga: true },
    });

    res.json(mapItem(up));
  } catch (err) {
    next(err);
  }
};
