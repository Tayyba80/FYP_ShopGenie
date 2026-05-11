import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateChatTitle } from "@/lib/generate-title";
import { getAIResponse } from "@/lib/ai";
import type { ExplanationOutput } from "@/types/product";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const content = body.content?.trim();
  if (!content) {
    return Response.json({ error: "Message required" }, { status: 400 });
  }

  const { chatId } = await params;

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      user: true,
    },
  });

  if (!chat || chat.user.email !== session.user.email) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  // Save user message (no metadata needed)
  const userMessage = await prisma.message.create({
    data: {
      chatId,
      role: "user",
      content,
    },
  });

  // Auto‑title on first message
  if (chat.messages.length === 0) {
    const title = await generateChatTitle(content);
    await prisma.chat.update({
      where: { id: chatId },
      data: { title },
    });
  }

  // Build conversation history including the new user message
  const allMessages = [...chat.messages, userMessage];
  const conversationHistory = allMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Get AI response (now returns ExplanationOutput | string)
  const result = await getAIResponse(conversationHistory);

  let explanation: ExplanationOutput;
  if (typeof result === 'string') {
    // Simple greeting or out‑of‑context response – no cards
    explanation = {
      query: content,
      timestamp: new Date().toISOString(),
      totalProducts: 0,
      totalFound: 0,
      chatResponse: result,
      productCards: [],
      suggestedFollowups: [],
      stats: { productsProcessed: 0, llmSuccessCount: 0, llmSuccessRate: '0%' },
    };
  } else {
    explanation = result;
  }
  const metadata = explanation as unknown as Prisma.InputJsonValue;

  // Save assistant message: content = natural language, metadata = full explanation
  const assistantMessage = await prisma.message.create({
    data: {
      chatId,
      role: "assistant",
      content: explanation.chatResponse,
      metadata: metadata,   // Prisma will store this as JSON
    },
  });

  // Touch chat updatedAt
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  // Return both messages with explanation attached to assistant
  return Response.json({
    userMessage,
    assistantMessage: {
      ...assistantMessage,
      explanation,   // using the full object again for immediate UI update
    },
  });
}