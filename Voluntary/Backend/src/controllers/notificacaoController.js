const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function resolveContext(req) {
  const usuarioId = req.user?.usuarioId || req.user?.id || null;
  const empresaId =
    req.user?.empresaId ||
    req.user?.empresa?.id ||
    (req.user?.tipo === "empresa" ? req.user?.id : null) ||
    null;
  return { usuarioId, empresaId };
}

exports.listarNotificacoes = async (req, res, next) => {
  try {
    const { usuarioId, empresaId } = resolveContext(req);
    if (!usuarioId && !empresaId) {
      return res.status(401).json({ error: "Não autenticado." });
    }
    const where = usuarioId ? { usuarioId } : { empresaId };
    const items = await prisma.notificacao.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      take: 50,
    });
    const unread = items.filter((n) => !n.lida).length;
    res.json({ items, unread });
  } catch (err) {
    next(err);
  }
};

exports.marcarNotificacaoLida = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "id obrigatório." });
    const { usuarioId, empresaId } = resolveContext(req);
    if (!usuarioId && !empresaId) {
      return res.status(401).json({ error: "Não autenticado." });
    }
    const notif = await prisma.notificacao.findUnique({ where: { id } });
    if (!notif) return res.status(404).json({ error: "Notificação não encontrada." });
    const owner =
      (usuarioId && notif.usuarioId === usuarioId) ||
      (empresaId && notif.empresaId === empresaId);
    if (!owner) return res.status(403).json({ error: "Sem permissão." });
    if (notif.lida) return res.json({ ok: true, notificacao: notif });

    const updated = await prisma.notificacao.update({
      where: { id },
      data: { lida: true },
    });
    res.json({ ok: true, notificacao: updated });
  } catch (err) {
    next(err);
  }
};

exports.marcarTodasLidas = async (req, res, next) => {
  try {
    const { usuarioId, empresaId } = resolveContext(req);
    if (!usuarioId && !empresaId) {
      return res.status(401).json({ error: "Não autenticado." });
    }
    const where = usuarioId ? { usuarioId } : { empresaId };
    const result = await prisma.notificacao.updateMany({
      where,
      data: { lida: true },
    });
    res.json({ ok: true, atualizadas: result.count });
  } catch (err) {
    next(err);
  }
};
