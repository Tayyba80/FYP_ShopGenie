import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, image } = await req.json();

  // Basic validation
  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      name: name.trim(),
      image: image || null,
    },
  });

  return NextResponse.json({ success: true });
}