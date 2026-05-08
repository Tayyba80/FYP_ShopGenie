import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  const { token, email, password } = await req.json();

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      email,
      tokenHash,
    },
  });

  if (!record || record.expires < new Date()) {
    return Response.json(
      { error: "Invalid or expired token" },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  await prisma.passwordResetToken.delete({
    where: { tokenHash },
  });

  return Response.json({ success: true });
}