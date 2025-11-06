const jwt = require('jsonwebtoken');

function authAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token ausente.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Não é administrador.' });
    }

    req.admin = payload; // disponível nas rotas se precisar
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

module.exports = authAdmin;