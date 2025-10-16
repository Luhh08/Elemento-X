function errorHandler(err, req, res, next) {
  console.error("🚨 Erro capturado:", err);
  res.status(err.statusCode || 500).json({
    error: err.message || "Erro interno do servidor",
  });
}

module.exports = { errorHandler };
