const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

// Middlewares e Rotas
const { errorHandler } = require("./src/middlewares/errorMiddleware");
const mainRoutes = require("./src/routes");
const verifyRoutes = require("./src/routes/verifyRoutes");
const passwordRoutes = require("./src/routes/passwordRoutes");
const userProfileRoutes = require("./src/routes/userProfileRoutes");
const empresaRoutes = require("./src/routes/empresaRoutes"); // ✅ rotas da empresa

const app = express();
const PORT = process.env.PORT ?? 3000;

// --- Middlewares Globais ---
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use(morgan("dev"));

// Servir arquivos estáticos da pasta Frontend
app.use(express.static(path.join(__dirname, "../Frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Rotas da Aplicação ---
app.get("/", (_req, res) => {
  const filePath = path.resolve(__dirname, "../Frontend/inicial.html");
  res.sendFile(filePath);
});

app.use(mainRoutes);
app.use("/api", verifyRoutes);
app.use("/api", passwordRoutes);
app.use("/api", userProfileRoutes);
app.use("/api", empresaRoutes); // ✅ adicionada aqui

// --- Middleware de Erro (sempre por último) ---
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
