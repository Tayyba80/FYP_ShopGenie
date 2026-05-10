import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  const body = await req.json();

  const { role, content } = body;

  const message = await prisma.message.create({
    data: {
      chatId: params.chatId,
      role,
      content,
    },
  });

  await prisma.chat.update({
    where: {
      id: params.chatId,
    },
    data: {
      updatedAt: new Date(),
    },
  });

  return Response.json(message);
}