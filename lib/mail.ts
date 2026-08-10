import nodemailer from "nodemailer";

// Gmail SMTP. Requires GMAIL_USER (the sending Gmail address) and
// GMAIL_APP_PASSWORD (a 16-character Google App Password — NOT the normal
// account password; see README for how to generate one) in .env.local.
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const transporter = getTransporter();
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/verify-email?token=${token}`;

  if (!transporter) {
    // No SMTP configured — fail loudly in the server log so setup issues are
    // obvious, but don't crash signup. In this mode the link is only visible
    // in the terminal, which is fine for local dev without email set up yet.
    console.warn(
      "[mail] GMAIL_USER/GMAIL_APP_PASSWORD not set — email not sent. Verification link:",
      verifyUrl
    );
    return { sent: false, verifyUrl };
  }

  await transporter.sendMail({
    from: `"Leads System" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Verify your email — Leads System",
    html: `
      <p>Hi ${name},</p>
      <p>Click the link below to verify your email and activate your account:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });

  return { sent: true, verifyUrl };
}
