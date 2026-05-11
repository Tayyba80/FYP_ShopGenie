import { ChatSidebar } from "@/components/chat/sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChatProvider } from "@/context/chatContext";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <ChatProvider>
      <div className="h-screen flex">
        <ChatSidebar user={session.user} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </ChatProvider>
  );
}