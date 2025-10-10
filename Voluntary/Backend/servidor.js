const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../Frontend"))); // Serve arquivos estáticos do front

// ================= Cadastro Usuário =================
app.post("/users", async (req, res) => {
  try {
    const { nome, usuario, email, cpf, senha } = req.body;

    if (!nome || !usuario || !email || !cpf || !senha) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    const novoUsuario = await prisma.usuario.create({
      data: { nome, usuario, email, cpf, senha },
    });

    res.status(201).json(novoUsuario);
  } catch (error) {
    console.error("Erro Prisma:", error);

    if (error.code === "P2002") {
      const campo = error.meta.target;
      return res.status(400).json({ error: `O ${campo} já está cadastrado.` });
    }

    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ================= Cadastro Empresa =================
app.post("/empresa", async (req, res) => {
  try {
    const { razao_social, email_empresa, cnpj, telefone_empresa, cep, endereco, senha } = req.body;

    if (!razao_social || !email_empresa || !cnpj || !telefone_empresa || !cep || !endereco || !senha) {
      return res.status(400).json({ error: "Todos os campos da empresa são obrigatórios." });
    }

    const empresa = await prisma.empresa.create({
      data: {
        razao_social,
        email_empresa,
        cnpj,
        telefone_empresa,
        cep,
        endereco,
        senha,
      },
    });

    res.status(201).json(empresa);
  } catch (error) {
    console.error("Erro Prisma:", error);

    if (error.code === "P2002") {
      return res.status(400).json({ error: "Um ou mais campos da empresa já estão em uso." });
    }

    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ================= Cadastro Representante Legal =================
app.post("/representante", async (req, res) => {
  try {
    const { nome, cpf, cargo, email_representante, telefone_representante } = req.body;

    if (!nome || !cpf || !cargo || !email_representante || !telefone_representante) {
      return res.status(400).json({ error: "Todos os campos do representante são obrigatórios." });
    }

    const representante = await prisma.RepresentanteLegal.create({
      data: { nome, cpf, cargo, email_representante, telefone_representante },
    });

    res.status(201).json(representante);
  } catch (error) {
    console.error("Erro Prisma:", error);

    if (error.code === "P2002") {
      return res.status(400).json({ error: "Um ou mais campos do representante já estão em uso." });
    }

    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ================= Login Usuário =================
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    const usuarioEncontrado = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuarioEncontrado) {
      return res.status(401).json({ error: "Email não encontrado" });
    }

    if (usuarioEncontrado.senha !== senha) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    res.status(200).json({
      message: "Login realizado com sucesso!",
      usuario: usuarioEncontrado,
    });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ error: "Erro ao realizar login" });
  }
});

// ================= Login Empresa =================
app.post('/login-empresa', async (req, res) => {
  try {
    const { cnpj, senha } = req.body;
    const empresa = await prisma.empresa.findUnique({ where: { cnpj } });

    if (!empresa) return res.status(401).json({ error: 'CNPJ não encontrado' });
    if (empresa.senha !== senha) return res.status(401).json({ error: 'Senha incorreta' });

    res.status(200).json({ message: 'Login realizado com sucesso!', empresa });
  } catch (error) {
    console.error('Erro no login da empresa:', error);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});


// ================= Lista de Usuários =================
app.get("/users", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany();
    res.status(200).json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// ================= Inicia Servidor =================
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

