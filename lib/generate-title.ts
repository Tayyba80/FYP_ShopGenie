export function generateChatTitle(message: string) {
  return message
    .slice(0, 40)
    .trim()
    .replace(/\n/g, " ");
}