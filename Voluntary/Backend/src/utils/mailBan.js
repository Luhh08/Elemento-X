const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendAdminNotice(to, subject, html) {
  if (!to) return;
  await transporter.sendMail({
    from: `"Equipe Voluntary" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

function tplBanimento({ nome, motivo }) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif">
      <h2>Conta banida</h2>
      <p>Olá ${nome || ""},</p>
      <p>Sua conta foi <strong>banida</strong> por violação das regras do Voluntary.</p>
      ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
      <p>Se você acredita que isso foi um engano, responda este e-mail para solicitar revisão.</p>
      <br/><p>Atenciosamente,<br/>Equipe Voluntary</p>
    </div>`;
}

function tplDesbanimento({ nome }) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif">
      <h2>Conta reativada</h2>
      <p>Olá ${nome || ""},</p>
      <p>Seu acesso ao Voluntary foi <strong>restaurado</strong>. Você já pode entrar normalmente.</p>
      <br/><p>Atenciosamente,<br/>Equipe Voluntary</p>
    </div>`;
}

module.exports = { sendAdminNotice, tplBanimento, tplDesbanimento };
