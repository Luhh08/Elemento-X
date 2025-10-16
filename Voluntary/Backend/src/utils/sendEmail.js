const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail(email, token) {
  // Esta URL está 100% correta!
  const verificationUrl = `${process.env.BACKEND_URL}/api/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Equipe Voluntary 👋" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verifique seu e-mail",
    html: `
      <h2>Verificação de e-mail</h2>
      <p>Olá! Clique abaixo para confirmar sua conta:</p>
      <a href="${verificationUrl}" style="display:inline-block;padding:10px 15px;background:#4CAF50;color:white;border-radius:5px;text-decoration:none;">Verificar e-mail</a>
      <p>Ou copie e cole este link no navegador:</p>
      <p>${verificationUrl}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendVerificationEmail };