const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function enviarEmail(destinatario, assunto, html) {
  return transporter.sendMail({
    from: `"Equipe Voluntary 👋" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: assunto,
    html,
  });
}

function gerarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = { enviarEmail, gerarCodigo };
