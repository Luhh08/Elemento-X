const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");
const { sendVerificationEmail } = require("../utils/sendEmail");
const { generateToken } = require("../utils/generateToken");

const prisma = new PrismaClient();
const SECRET_KEY = process.env.FLE_MASTER_KEY; 

// Cadastro de usuário
async function registrarUsuario(req, res, next) {
  try {
    const { nome, usuario, email, cpf, senha } = req.body;

const usuarioBanido = await prisma.usuario.findFirst({
  where: {
    OR: [{ email }, { cpf }],
    isBanned: true,
  },
});

if (usuarioBanido) {
  return res.status(403).json({
    error: "Cadastro bloqueado. Este e-mail ou CPF está banido do sistema.",
  });
}

    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente)
      return res.status(400).json({ error: "E-mail já cadastrado." });

    const senhaDescriptografada = CryptoJS.AES.decrypt(senha, SECRET_KEY).toString(CryptoJS.enc.Utf8);

    if (!senhaDescriptografada)
      return res.status(400).json({ error: "Erro ao descriptografar a senha." });

    const senhaHash = await bcrypt.hash(senhaDescriptografada, 12);

    const token = generateToken({ email }, "1h");

    await prisma.usuario.create({
      data: {
        nome,
        usuario,
        email,
        cpf,
        senha: senhaHash,
        validacaoToken: token,
        validacao: false,
      },
    });

    res.status(201).json({ message: "Usuário criado! Verifique seu e-mail." });

    sendVerificationEmail(email, token).catch((error) => {
      console.error("Erro ao enviar email de verificação:", error);
    });

  } catch (err) {
    next(err);
  }
}

// Verificação de e-mail
async function verificarEmail(req, res, next) {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await prisma.usuario.findUnique({ where: { email: decoded.email } });
    if (!usuario) return res.status(404).send("Usuário não encontrado.");

    await prisma.usuario.update({
      where: { email: decoded.email },
      data: { validacao: true, validacaoToken: null },
    });

    res.redirect(`${process.env.FRONTEND_URL}/email-verificado.html`);
  } catch (err) {
    next(err);
  }
}

// Login do usuário
async function loginUsuario(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha)
      return res.status(400).json({ error: "Email e senha são obrigatórios." });

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(401).json({ error: "Email não encontrado." });

if (usuario.isBanned) {
  return res.status(403).json({
    error: `Conta banida. Motivo: ${usuario.banReason || "Violação das regras."}`,
  });
}

    const senhaDescriptografada = CryptoJS.AES.decrypt(senha, SECRET_KEY).toString(CryptoJS.enc.Utf8);

    if (!senhaDescriptografada)
      return res.status(400).json({ error: "Erro ao descriptografar a senha." });

    const isPasswordValid = await bcrypt.compare(senhaDescriptografada, usuario.senha);
    if (!isPasswordValid) return res.status(401).json({ error: "Senha incorreta." });

    if (!usuario.validacao)
      return res.status(401).json({ error: "E-mail não verificado." });

    const token = generateToken({ id: usuario.id, email: usuario.email });

    const { senha: _, ...usuarioSeguro } = usuario;

    res.status(200).json({
      message: "Login realizado com sucesso!",
      token,
      usuario: usuarioSeguro,
    });

  } catch (err) {
    next(err);
  }
}

async function listarUsuarios(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(req.query.pageSize || '50', 10)));
    const skip     = (page - 1) * pageSize;

    const q = (req.query.q || '').trim();
    const where = q
      ? {
          OR: [
            { nome: { contains: q, mode: 'insensitive' } },
            { emailcontato: { contains: q, mode: 'insensitive' } },
            { competencias: { hasSome: [q] } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          fotoUrl: true,
          emailcontato: true,
          telefonecontato: true,
          competencias: true,
          isBanned: true,
        },
      }),
      prisma.usuario.count({ where }),
    ]);

    const data = items.map(u => ({
      id: u.id,
      nome: u.nome || 'Voluntário',
      fotoUrl: u.fotoUrl || null,
      emailcontato: u.emailcontato || null,
      telefonecontato: u.telefonecontato || null,
      competencias: Array.isArray(u.competencias) ? u.competencias : [],
      isBanned: !!u.isBanned,
    }));

    res.json({ items: data, total, page, pageSize });
  } catch (err) {
    next(err);
  }
}

async function listarCompetenciasUsuarios(req, res, next) {
  try {
    const rows = await prisma.usuario.findMany({
      select: { competencias: true },
    });
    const set = new Set();
    for (const r of rows) {
      for (const t of (r.competencias || [])) {
        const v = String(t || '').trim();
        if (v) set.add(v);
      }
    }
    const items = Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registrarUsuario,
  verificarEmail,
  loginUsuario,
  listarUsuarios,
  listarCompetenciasUsuarios,
};

