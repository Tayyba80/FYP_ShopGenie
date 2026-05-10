import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  const chat = await prisma.chat.findUnique({
    where: {
      id: params.chatId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return Response.json(chat);
}