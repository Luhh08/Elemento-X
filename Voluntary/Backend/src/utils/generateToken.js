const jwt = require("jsonwebtoken");

function generateToken(payload, expiresIn = "2h") {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

module.exports = { generateToken };
