const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");
const { sendVerificationEmail } = require("../utils/sendEmail");

// === NOVO: utilitários para banner ===
const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");
// Base para montar URL absoluta quando necessário
const BASE = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

const prisma = new PrismaClient();

// use a MESMA chave que o frontend (ideal: vir do .env)
const EMPRESA_AES_KEY =
  process.env.EMPRESA_AES_KEY || "chaveSeguraDe32Caracteres1234567890";

// ================================
// Helpers
// ================================
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
const formatCNPJMask = (d14) => {
  const d = onlyDigits(d14).padEnd(14, "0").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

// calcula % de perfil preenchido
function calcProgresso(e = {}) {
  let pontos = 0;
  const total = 8;

  if (e.razao_social) pontos++;
  if (e.usuario) pontos++;
  if (e.descricao) pontos++;
  if (Array.isArray(e.tags) && e.tags.length) pontos++;
  if (e.logoUrl) pontos++;
  if (e.bannerUrl) pontos++;
  if (e.telefonecontato || e.telefone_empresa) pontos++;
  if (e.endereco && e.cep) pontos++;

  return Math.round((pontos / total) * 100);
}

// remove arquivo salvo caso inválido
async function safeUnlink(absPath) {
  try { await fs.unlink(absPath); } catch { /* ignore */ }
}

// ================================
// Registrar empresa + representante
// ================================
async function registrarEmpresa(req, res) {
  try {
    const { empresa, representante } = req.body;

    if (!empresa || !representante) {
      return res
        .status(400)
        .json({ error: "Dados de empresa e representante são obrigatórios." });
    }

    const {
      razao_social,
      email,
      senha,
      cnpj,
      telefone_empresa,
      endereco,
      cep,
    } = empresa;
    const {
      nome,
      cpf,
      cargo,
      email_representante,
      telefone_representante,
    } = representante;

    if (
      !razao_social ||
      !email ||
      !senha ||
      !cnpj ||
      !telefone_empresa ||
      !endereco ||
      !cep
    ) {
      return res
        .status(400)
        .json({ error: "Preencha todos os campos da empresa." });
    }
    if (!nome || !cpf || !cargo || !email_representante || !telefone_representante) {
      return res
        .status(400)
        .json({ error: "Preencha todos os campos do representante." });
    }

    const hashed = await bcrypt.hash(senha, 10);
    const token = crypto.randomBytes(24).toString("hex");

    const novaEmpresa = await prisma.empresa.create({
      data: {
        razao_social,
        email,
        senha: hashed,
        cnpj, // pode ser com máscara; login aceita ambos
        telefone_empresa,
        endereco,
        cep,
        validacaoToken: token,
      },
    });

    await prisma.representanteLegal.create({
      data: {
        nome,
        cpf,
        cargo,
        email_representante,
        telefone_representante,
        empresaId: novaEmpresa.id,
      },
    });

    await sendVerificationEmail(email, token);

    return res.status(201).json({
      message: "Empresa e representante cadastrados. Verifique seu e-mail.",
    });
  } catch (err) {
    console.error("registrarEmpresa error:", err);
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ error: "E-mail, CPF ou CNPJ já cadastrado." });
    }
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}

// ================================
// Verificar e-mail via token
// ================================
async function verificarEmail(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token ausente");

    const empresa = await prisma.empresa.findFirst({
      where: { validacaoToken: token },
    });
    if (!empresa)
      return res.status(404).send("Token inválido ou empresa não encontrada");

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { validacao: true, validacaoToken: null },
    });

    return res.redirect(`${process.env.FRONTEND_URL}/verify-empresa-success`);
  } catch (err) {
    console.error("verificarEmail error:", err);
    return res.status(500).send("Erro ao verificar e-mail");
  }
}

// ================================
// Solicitar redefinição de senha
// ================================
async function solicitarRedefinicao(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Informe o e-mail" });

    const empresa = await prisma.empresa.findUnique({ where: { email } });
    if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

    const token = crypto.randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { resetToken: token, resetTokenExpires: expires },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-empresa?token=${token}`;

    const transporter = require("nodemailer").createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Equipe Voluntary 👋" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Redefinição de senha",
      html: `
        <h2>Redefinir senha</h2>
        <p>Olá ${empresa.razao_social || ""}, clique abaixo para redefinir sua senha:</p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 15px;background:#ff6b6b;color:white;border-radius:5px;text-decoration:none;">Redefinir senha</a>
        <p>Ou copie este link:</p>
        <p>${resetUrl}</p>
      `,
    });

    return res.json({ message: "E-mail de redefinição enviado" });
  } catch (err) {
    console.error("solicitarRedefinicao error:", err);
    return res.status(500).json({ error: "Erro ao enviar e-mail de redefinição" });
  }
}

// ================================
// Login da empresa
// ================================
async function loginEmpresa(req, res) {
  try {
    const cnpjDigits = String(req.body.cnpj || "").replace(/\D/g, "");
    const senhaCriptografada = String(req.body.senha || "");

    if (!cnpjDigits || !senhaCriptografada) {
      return res.status(400).json({ error: "CNPJ e senha são obrigatórios." });
    }

    // 🔓 descriptografar senha (AES)
    let senhaDescriptografada = "";
    try {
      const bytes = CryptoJS.AES.decrypt(senhaCriptografada, EMPRESA_AES_KEY);
      senhaDescriptografada = bytes.toString(CryptoJS.enc.Utf8);
    } catch (_e) { /* cai no check abaixo */ }

    if (!senhaDescriptografada) {
      return res.status(400).json({ error: "Falha ao descriptografar a senha." });
    }

    // procura empresa por CNPJ com/sem máscara
    const formatCNPJ = (d14) => d14
      .replace(/\D/g,"").slice(0,14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");

    let empresa = await prisma.empresa.findUnique({ where: { cnpj: cnpjDigits } });
    if (!empresa) empresa = await prisma.empresa.findUnique({ where: { cnpj: formatCNPJ(cnpjDigits) } });
    if (!empresa) return res.status(401).json({ error: "CNPJ não encontrado." });

    const ok = await bcrypt.compare(senhaDescriptografada, empresa.senha);
    if (!ok) return res.status(401).json({ error: "Senha incorreta." });

    if (!empresa.validacao) {
      return res.status(403).json({ error: "Conta não verificada. Verifique seu e-mail." });
    }

    const token = jwt.sign(
      { sub: empresa.id, typ: "empresa" },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    );

    const progresso = calcProgresso(empresa);
    return res.json({
      message: "Login realizado com sucesso!",
      token,
      empresa: {
        id: empresa.id,
        razao_social: empresa.razao_social,
        email: empresa.email,
        cnpj: empresa.cnpj,
        usuario: empresa.usuario || null,
        logoUrl: empresa.logoUrl || null,
        bannerUrl: empresa.bannerUrl || null,
        progresso,
      },
    });
  } catch (error) {
    console.error("loginEmpresa error:", error);
    return res.status(500).json({ error: "Erro ao realizar login." });
  }
}

// ================================
// Redefinir senha com token
// ================================
async function redefinirSenha(req, res) {
  try {
    const { token, senha } = req.body;
    if (!token || !senha)
      return res
        .status(400)
        .json({ error: "Token e nova senha são obrigatórios" });

    const empresa = await prisma.empresa.findFirst({
      where: { resetToken: token, resetTokenExpires: { gt: new Date() } },
    });
    if (!empresa)
      return res.status(400).json({ error: "Token inválido ou expirado" });

    const hashed = await bcrypt.hash(senha, 10);
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { senha: hashed, resetToken: null, resetTokenExpires: null },
    });
    return res.json({ message: "Senha redefinida com sucesso" });
  } catch (err) {
    console.error("redefinirSenha error:", err);
    return res.status(500).json({ error: "Erro ao redefinir senha" });
  }
}

// ================================
// Obter perfil público por ID
// ================================
async function obterPerfilPorId(req, res) {
  try {
    const { id } = req.params;
    const empresa = await prisma.empresa.findUnique({
      where: { id },
      select: {
        id: true,
        razao_social: true,
        usuario: true,
        email: true,
        telefone_empresa: true,
        emailcontato: true,
        telefonecontato: true,
        endereco: true,
        cep: true,
        validacao: true,
        criadoEm: true,
        representantes: true,
        descricao: true,
        tags: true,
        logoUrl: true,
        bannerUrl: true,
      },
    });

    if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

    const progresso = calcProgresso(empresa);
    return res.json({ ...empresa, progresso });
  } catch (err) {
    console.error("obterPerfilPorId error:", err);
    return res.status(500).json({ error: "Erro ao buscar perfil" });
  }
}

// ================================
// Perfil + progresso (completo)
// ================================
async function getEmpresa(req, res, next) {
  try {
    const { id } = req.params;
    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
    const progresso = calcProgresso(empresa);
    res.json({ ...empresa, progresso });
  } catch (e) { next(e); }
}

// ================================
// Atualiza perfil
// ================================
async function updateEmpresa(req, res, next) {
  try {
    const { id } = req.params;
    const {
      razao_social, descricao, tags,
      telefone_empresa,
      emailcontato,
      telefonecontato,
      cep, endereco, bannerUrl, logoUrl,
      usuario,
    } = req.body;

    // normalização robusta do usuario
    let usuarioNorm = undefined;
    if (typeof usuario === "string") {
      const raw = usuario.trim();
      const cleaned = raw.replace(/^@+/, "")
                         .toLowerCase()
                         .replace(/\s+/g, "")
                         .replace(/[^a-z0-9._-]/g, "");
      if (cleaned) usuarioNorm = cleaned;
    }

    const empresa = await prisma.empresa.update({
      where: { id },
      data: {
        razao_social,
        descricao,
        tags: Array.isArray(tags)
          ? tags
          : (tags ? String(tags).split(",").map(s => s.trim()).filter(Boolean) : []),
        telefone_empresa,
        emailcontato:     emailcontato ?? undefined,
        telefonecontato: (telefonecontato ? String(telefonecontato).replace(/\D/g, "") : undefined),
        cep,
        endereco,
        bannerUrl,
        logoUrl,
        usuario: usuarioNorm, // se undefined, Prisma ignora; se string válida, atualiza
      }
    });

    const progresso = calcProgresso(empresa);
    res.json({ ...empresa, progresso });
  } catch (e) {
    if (e?.code === "P2002") {
      const t = Array.isArray(e.meta?.target) ? e.meta.target.join(",") : String(e.meta?.target || "");
      if (t.includes("usuario")) {
        return res.status(409).json({ error: "Este usuário já está em uso." });
      }
      return res.status(409).json({ error: "Valor duplicado em campo único." });
    }
    console.error("updateEmpresa error:", e);
    return res.status(500).json({ error: "Erro ao atualizar perfil." });
  }
}

// ================================
// Upload de logo/banner  (com validação de banner 3:2)
// ================================
async function uploadImagem(req, res, next) {
  try {
    const { id, tipo } = req.params; // logo | banner
    if (!req.file) return res.status(400).json({ error: "Arquivo ausente" });

    // caminho absoluto do arquivo salvo pelo Multer
    const absPath = path.join(__dirname, "..", "..", "uploads", req.file.filename);

    // validação específica para banner: proporção mínima 3:2 e tamanho recomendado 1200x800
    if (tipo === "banner") {
      try {
        const meta = await sharp(absPath).metadata();
        const { width, height } = meta || {};
        if (!width || !height) {
          await safeUnlink(absPath);
          return res.status(400).json({ error: "Não foi possível ler as dimensões do banner." });
        }
        const ratio = width / height;
        const MIN_W = 1200, MIN_H = 800; // recomendado
        const sizeOk = width >= MIN_W && height >= MIN_H;

        if (ratio < 1.5 || !sizeOk) {
          await safeUnlink(absPath);
          return res.status(400).json({
            error: "O banner deve ter proporção mínima 3:2 (ex.: 1200×800) ou maior (mais horizontal)."
          });
        }
      } catch (e) {
        await safeUnlink(absPath);
        return res.status(400).json({ error: "Falha ao validar o banner enviado." });
      }
    }

    // mantém padrão atual do seu código: salvar URL RELATIVA
    const url = `/uploads/${req.file.filename}`;
    const data = {};
    if (tipo === "logo") data.logoUrl = url;
    else if (tipo === "banner") data.bannerUrl = url;
    else {
      await safeUnlink(absPath);
      return res.status(400).json({ error: "tipo inválido" });
    }

    const empresa = await prisma.empresa.update({ where: { id }, data });
    const progresso = calcProgresso(empresa);
    res.json({ empresa: { ...empresa, progresso } });
  } catch (e) {
    next(e);
  }
}

// ================================
// Vagas
// ================================
async function listarVagasDaEmpresa(req, res, next) {
  try {
    const { id } = req.params;
    const vagas = await prisma.vaga.findMany({
      where: { empresaId: id },
      orderBy: { id: 'desc' }
    });
    res.json(vagas);
  } catch (e) { next(e); }
}

// === ALTERADO: agora aceita req.files (imagens) e junta com URLs do body ===
async function criarVagaParaEmpresa(req, res, next) {
  try {
    const { id } = req.params; // empresaId

    // BLOQUEIO: exige 100% do perfil
    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

    const progresso = calcProgresso(empresa);
    if (progresso < 100) {
      return res.status(403).json({
        error: "Complete 100% do perfil da empresa para publicar uma vaga.",
        progressoAtual: progresso
      });
    }

    const {
      titulo,
      descricao,
      tags,
      local,
      turno,
      dataInicio,
      dataFim,
      status,
      imagens, // pode vir como array de URLs ou CSV
    } = req.body;

    // 1) URLs vindas no body (opcional)
    let bodyUrls = [];
    if (Array.isArray(imagens)) {
      bodyUrls = imagens.filter(Boolean);
    } else if (typeof imagens === "string" && imagens.trim()) {
      bodyUrls = imagens.split(",").map(s => s.trim()).filter(Boolean);
    }

    // 2) URLs geradas pelos arquivos enviados (req.files)
    // manteremos coerente com upload de empresa: URL RELATIVA
    const fileUrls = (req.files || []).map(f => `/uploads/${f.filename}`);

    const todasAsImagens = [...bodyUrls, ...fileUrls];

    const vaga = await prisma.vaga.create({
      data: {
        empresaId: id,
        titulo,
        descricao,
        tags: Array.isArray(tags)
          ? tags
          : (typeof tags === "string" ? tags.split(",").map(s=>s.trim()).filter(Boolean) : []),
        local,
        turno: Array.isArray(turno)
          ? turno
          : (typeof turno === "string" ? turno.split(",").map(s=>s.trim()).filter(Boolean) : []),
        status,
        dataInicio: dataInicio ? new Date(dataInicio) : null,
        dataFim: dataFim ? new Date(dataFim) : null,
        imagens: todasAsImagens, // usa seu campo existente (String[])
      },
    });

    res.status(201).json(vaga);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  registrarEmpresa,
  verificarEmail,
  solicitarRedefinicao,
  redefinirSenha,
  obterPerfilPorId,
  getEmpresa,
  updateEmpresa,
  uploadImagem,
  listarVagasDaEmpresa,
  criarVagaParaEmpresa,
  loginEmpresa,
};
