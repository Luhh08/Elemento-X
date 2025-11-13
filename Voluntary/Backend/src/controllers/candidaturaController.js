const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { enviarEmail } = require("../utils/emailUtils");
const { registrarNotificacao } = require("../utils/notificacaoService");

async function criarCandidatura(req, res, next) {
  try {
    const { vagaId } = req.body;
    const voluntarioId = req.user?.usuarioId || req.user?.id;

    if (!voluntarioId) return res.status(401).json({ error: "Não autenticado." });
    if (!vagaId) return res.status(400).json({ error: "vagaId é obrigatório." });

    const vaga = await prisma.vaga.findUnique({
      where: { id: vagaId },
      select: {
        id: true,
        status: true,
        titulo: true,
        empresaId: true,
        empresa: {
          select: {
            id: true,
            razao_social: true,
            email: true,
            emailcontato: true
          }
        }
      }
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

    const voluntario = await prisma.usuario.findUnique({ where: { id: voluntarioId }, select: { id: true, nome: true, email: true, usuario: true } });

    const nova = await prisma.candidatura.create({
      data: { vagaId, voluntarioId }
    });

    // Notificar por e-mail a empresa responsável (se tiver e-mail)
    try {
      const empresa = vaga.empresa || null;
      const destinatario = (empresa && (empresa.emailcontato || empresa.email)) || null;
      if (destinatario) {
        const assunto = `Nova candidatura para a vaga: ${vaga.titulo}`;
        const html = `
          <h3>Nova candidatura recebida</h3>
          <p>Olá ${empresa.razao_social || "responsável"},</p>
          <p>O voluntário <strong>${voluntario?.nome || 'Um usuário'}</strong> se candidatou à sua vaga <strong>"${vaga.titulo}"</strong>.</p>
          <p>Verifique as candidaturas na área de empresas para aceitar ou recusar a candidatura.</p>
        `;
        await enviarEmail(destinatario, assunto, html);
      }
    } catch (e) {
      // Não bloquear a criação por falha de envio de e-mail
      console.error('Erro ao enviar e-mail de nova candidatura:', e);
    }

    if (vaga.empresa?.id) {
      try {
        await registrarNotificacao({
          empresaId: vaga.empresa.id,
          titulo: "Nova candidatura recebida",
          mensagem: `O voluntário ${voluntario?.nome || "um usuário"} se candidatou à vaga "${vaga.titulo}".`,
          categoria: "CANDIDATURA",
          link: `/gerenciar_aplicacoes.html?vaga=${encodeURIComponent(vagaId)}`
        });
      } catch (e) {
        console.error("Erro ao registrar notificação da empresa:", e);
      }
    }

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

    const userId = req.user?.usuarioId || req.user?.id || null;
    const empresaId =
      req.user?.empresaId ||
      req.user?.empresa?.id ||
      (req.user?.tipo === "empresa" ? (req.user?.empresaId || req.user?.id) : null) ||
      null;

    if (!empresaId && !userId) {
      return res.status(403).json({ error: "Perfil não autorizado para listar candidaturas." });
    }

    let where = {};
    let include = {};

    if (empresaId) {
      const vagas = await prisma.vaga.findMany({
        where: { empresaId },
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
        // 🔴 Agora inclui imagens e dados mínimos da empresa
        vaga: {
          select: {
            id: true,
            titulo: true,
            status: true,
            empresaId: true,
            imagens: true,
            empresa: { select: { id: true, razao_social: true, logoUrl: true } }
          }
        }
      };
    } else if (userId) {
      where = { voluntarioId: userId };
      include = {
        vaga: {
          select: {
            id: true,
            titulo: true,
            status: true,
            empresaId: true,
            imagens: true,
            empresa: { select: { id: true, razao_social: true, logoUrl: true } }
          }
        }
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
          },
          // 🔴 Aqui também traz imagens e empresa da vaga
          vaga: {
            select: {
              id: true,
              titulo: true,
              status: true,
              empresaId: true,
              imagens: true,
              empresa: { select: { id: true, razao_social: true, logoUrl: true } }
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

    const valid = ["ACEITA", "RECUSADA", "INSCRITA", "EM_ANDAMENTO"];
    if (!valid.includes(String(status || ""))) {
      return res.status(400).json({ error: "Status inválido." });
    }

    // Buscar candidatura atual com vaga e voluntario para validações e notificação
    const candidaturaAtual = await prisma.candidatura.findUnique({
      where: { id },
      include: {
        vaga: { select: { id: true, titulo: true, status: true, empresaId: true } },
        voluntario: { select: { id: true, nome: true, email: true } }
      }
    });
    if (!candidaturaAtual) return res.status(404).json({ error: 'Candidatura não encontrada.' });

    const vagaStatus = candidaturaAtual.vaga?.status;
    // Bloquear aceitar/recusar se a vaga já estiver em andamento ou finalizada
    if (['ANDAMENTO', 'FINALIZADA'].includes(String(vagaStatus))) {
      return res.status(400).json({ error: 'Não é possível alterar a situação da candidatura quando a vaga está em andamento ou finalizada.' });
    }

    const up = await prisma.candidatura.update({ where: { id }, data: { status } });

    // Enviar notificação por e-mail ao voluntário quando for aceito ou recusado
    try {
      const destinatario = candidaturaAtual.voluntario?.email || null;
      if (destinatario && (status === 'ACEITA' || status === 'RECUSADA')) {
        const assunto = status === 'ACEITA' ? 'Sua candidatura foi aceita!' : 'Sua candidatura foi recusada';
        const mensagem = status === 'ACEITA'
          ? `<p>Parabéns ${candidaturaAtual.voluntario.nome}, sua candidatura para a vaga <strong>${candidaturaAtual.vaga.titulo}</strong> foi <strong>aceita</strong>.</p>`
          : `<p>Olá ${candidaturaAtual.voluntario.nome}, sua candidatura para a vaga <strong>${candidaturaAtual.vaga.titulo}</strong> foi <strong>recusada</strong>.</p>`;

        const html = `
          <h3>${assunto}</h3>
          ${mensagem}
          <p>Verifique sua área de candidaturas para mais detalhes.</p>
        `;
        await enviarEmail(destinatario, assunto, html);
      }
    } catch (e) {
      console.error('Erro ao enviar e-mail de atualização de status:', e);
    }

    try {
      await registrarNotificacao({
        usuarioId: candidaturaAtual.voluntario?.id,
        titulo: status === "ACEITA"
          ? "Sua candidatura foi aceita"
          : status === "RECUSADA"
            ? "Sua candidatura foi recusada"
            : "Status da candidatura atualizado",
        mensagem: `A vaga "${candidaturaAtual.vaga.titulo}" agora está marcada como ${mapStatusTexto(status)}.`,
        categoria: "STATUS_CANDIDATURA",
        link: `/descricao_vagas.html?id=${candidaturaAtual.vaga.id}`
      });
    } catch (e) {
      console.error("Erro ao registrar notificação de status:", e);
    }

    res.json({ message: "Status atualizado.", candidatura: up });
  } catch (err) {
    next(err);
  }
}

function mapStatusTexto(status) {
  switch (String(status || "").toUpperCase()) {
    case "ACEITA":
      return "aceita";
    case "RECUSADA":
      return "recusada";
    case "EM_ANDAMENTO":
      return "em andamento";
    default:
      return "em análise";
  }
}

module.exports = {
  criarCandidatura,
  listarCandidaturas,
  listarCandidaturasDaVaga,
  atualizarStatus
};
