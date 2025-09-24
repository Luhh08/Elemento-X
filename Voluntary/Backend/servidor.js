const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../Frontend")));

// ================= Cadastro =================
app.post("/users", async (req, res) => {
  try {
    const { nome, usuario, email, cpf, senha } = req.body;

    const novoUsuario = await prisma.usuario.create({
      data: { nome, usuario, email, cpf, senha },
    });

    res.status(201).json(novoUsuario);
  } catch (error) {
    console.error("Erro Prisma:", error);

    // Verifica se o erro é de unique constraint
    if (error.code === "P2002") {
      const campo = error.meta.target;
      return res.status(400).json({ error: `O ${campo} já está cadastrado.` });
    }

    res.status(500).json({ error: error.message });
  }
});

// ================= Lista de usuários =================
app.get("/users", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany();
    res.status(200).json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// ================= Login =================
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body; // agora login por email

    // Busca usuário pelo email
    const usuarioEncontrado = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuarioEncontrado) {
      return res.status(401).json({ error: "Email não encontrado" });
    }

    if (usuarioEncontrado.senha !== senha) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    // Login bem-sucedido
    res.status(200).json({
      message: "Login realizado com sucesso!",
      usuario: usuarioEncontrado,
    });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ error: "Erro ao realizar login" });
  }
});

// ================= Inicia servidor =================
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});