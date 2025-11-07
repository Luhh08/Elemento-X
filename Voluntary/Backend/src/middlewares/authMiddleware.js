const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "dev-secret";

function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      console.error("Erro ao verificar token:", err.message);
      return res
        .status(401)
        .json({ error: "Sessão expirada ou token inválido." });
    }

    if (decoded.typ === "empresa" || decoded.tipo === "empresa") {
      req.user = {
        tipo: "empresa",
        empresaId: decoded.sub || decoded.empresaId || decoded.id,
      };
    } else if (decoded.typ === "usuario" || decoded.tipo === "usuario") {
      req.user = {
        tipo: "usuario",
        usuarioId: decoded.sub || decoded.usuarioId || decoded.id,
      };
    } else {
      req.user = decoded;
    }

    next();
  });
}

module.exports = autenticarToken;
