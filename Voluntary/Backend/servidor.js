require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

// Middlewares e Rotas
const { errorHandler } = require("./src/middlewares/errorMiddleware");

const mainRoutes = require("./src/routes");
const userRoutes = require("./src/routes/userRoutes");
const verifyRoutes = require("./src/routes/verifyRoutes");
const passwordRoutes = require("./src/routes/passwordRoutes");
const userProfileRoutes = require("./src/routes/userProfileRoutes");
const empresaRoutes = require("./src/routes/empresaRoutes");
const vagaRoutes = require("./src/routes/vagaRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", mainRoutes);
app.use("/api", userRoutes);
app.use("/api", verifyRoutes);
app.use("/api", passwordRoutes);
app.use("/api", userProfileRoutes);
app.use("/api", empresaRoutes);
app.use("/api", vagaRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "Rota não encontrada" }));

app.use(express.static(path.join(__dirname, "../Frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Rotas da Aplicação ---
app.get("/", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../Frontend/inicial.html"));
});

app.use(mainRoutes);

// --- Middleware de Erro (sempre por último) ---
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
}

module.exports = app;
