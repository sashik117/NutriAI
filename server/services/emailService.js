import nodemailer from 'nodemailer';

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
  if (!smtpConfigured()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function verificationEmailHtml(code) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#17231d">
      <h1 style="font-size:24px;margin:0 0 12px">NutriAI email verification</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 18px">Use this code to finish creating your NutriAI account.</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:800;background:#ecfdf3;border-radius:16px;padding:18px 20px;text-align:center;color:#15803d">
        ${code}
      </div>
      <p style="font-size:13px;line-height:1.5;margin:18px 0 0;color:#66736c">The code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    </div>
  `;
}

export async function sendVerificationCode(email, code) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`NutriAI verification code for ${email}: ${code}`);
    return { sent: false, mode: 'dev-fallback' };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'NutriAI verification code',
    text: `Your NutriAI verification code is ${code}. It expires in 10 minutes.`,
    html: verificationEmailHtml(code),
  });

  return { sent: true, mode: 'smtp' };
}
