const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

// Middlewares e Rotas
const { errorHandler } = require("./src/middlewares/errorMiddleware");
const mainRoutes = require("./src/routes"); // Assumindo que você tem um index.js em /routes
const verifyRoutes = require('./src/routes/verifyRoutes'); // Importando as novas rotas de verificação

const app = express();
const PORT = process.env.PORT ?? 3000;

// --- Middlewares Globais ---
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("dev"));

// Servir arquivos estáticos da pasta Frontend
app.use(express.static(path.join(__dirname, "../Frontend")));

// --- Rotas da Aplicação ---
app.get("/", (_req, res) => {
  const filePath = path.resolve(__dirname, "../Frontend/inicial.html");
  res.sendFile(filePath);
});

app.use(mainRoutes); // Suas rotas principais (login, registro, etc.)
app.use('/api', verifyRoutes); // Nossas rotas de verificação com prefixo /api

// --- Middleware de Erro (Deve ser o último) ---
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});