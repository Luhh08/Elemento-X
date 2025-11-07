require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { errorHandler } = require("./src/middlewares/errorMiddleware");

const mainRoutes = require("./src/routes");
const userRoutes = require("./src/routes/userRoutes");
const verifyRoutes = require("./src/routes/verifyRoutes");
const passwordRoutes = require("./src/routes/passwordRoutes");
const userProfileRoutes = require("./src/routes/userProfileRoutes");
const empresaRoutes = require("./src/routes/empresaRoutes");
const vagaRoutes = require("./src/routes/vagaRoutes");
const candidaturaRoutes = require("./src/routes/candidaturaRoutes");
const authAdmin = require("./src/middlewares/authAdmin");
const adminRoutes = require("./src/routes/adminRoutes");
const avaliacaoRoutes = require("./src/routes/avaliacaoRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

const uploadsAbs = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsAbs));
app.use("/api/uploads", express.static(uploadsAbs));
app.use(express.static(path.join(__dirname, "../Frontend")));

app.use("/api", mainRoutes);
app.use("/api", userRoutes);
app.use("/api", verifyRoutes);
app.use("/api", passwordRoutes);
app.use("/api", userProfileRoutes);
app.use("/api", empresaRoutes);
app.use("/api", vagaRoutes);
app.use("/api", candidaturaRoutes);
app.use("/api/admin", adminRoutes);
app.get("/api/admin/painel", authAdmin, (req, res) => res.json({ ok: true }));
app.use("/api/empresas", empresaRoutes);
app.use("/api", avaliacaoRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "Rota não encontrada" }));

app.get("/", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../Frontend/inicial.html"));
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
}

module.exports = app;
