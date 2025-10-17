const nodemailer = require("nodemailer");

// Configurações do Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.enviarEmail = async (to, subject, html) => {
  return transporter.sendMail({
    from: `"Equipe Voluntary 👋" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

// Gera código aleatório de 6 dígitos
exports.gerarCodigo = () => Math.floor(100000 + Math.random() * 900000).toString();
