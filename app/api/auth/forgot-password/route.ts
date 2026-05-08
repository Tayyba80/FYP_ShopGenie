import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { transporter } from "@/lib/mailer";

export async function POST(req: Request) {
  const { email } = await req.json();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // always respond same (security)
  if (!user) {
    return Response.json({ success: true });
  }

  // raw token (sent to email)
  const token = crypto.randomBytes(32).toString("hex");

  // hashed token (stored)
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      email,
      tokenHash,
      expires: new Date(Date.now() + 1000 * 60 * 30), // 30 min
    },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${email}`;

  await transporter.sendMail({
    from: `"ShopGenie" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset Your Password",
    html: `
      <div style="font-family:Arial;padding:20px">
        <h2>Reset Your Password</h2>
        <p>Click below to reset your password:</p>
        <a href="${resetUrl}" style="padding:10px 15px;background:#7c3aed;color:white;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
        <p>This link expires in 30 minutes.</p>
      </div>
    `,
  });

  return Response.json({ success: true });
}