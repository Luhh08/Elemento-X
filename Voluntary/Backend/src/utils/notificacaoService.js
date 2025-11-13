const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function sanitizeText(value, fallback = "") {
  if (!value) return fallback;
  return String(value);
}

async function registrarNotificacao({
  titulo,
  mensagem,
  categoria = null,
  link = null,
  usuarioId = null,
  empresaId = null,
} = {}) {
  try {
    if (!usuarioId && !empresaId) return null;
    return await prisma.notificacao.create({
      data: {
        titulo: sanitizeText(titulo, "Notificação"),
        mensagem: sanitizeText(mensagem, ""),
        categoria,
        link,
        usuarioId,
        empresaId,
      },
    });
  } catch (err) {
    console.error("[registrarNotificacao] erro:", err);
    return null;
  }
}

module.exports = { registrarNotificacao };
