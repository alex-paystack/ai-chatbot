import type { Route } from "./+types/chat";
import { useMemo } from "react";
import { ChatPanel } from "~/components/chat/chat-panel";
import { PageAssistantProvider } from "~/components/assistant/page-assistant-context";
import type { AssistantPageContext } from "~/lib/assistant-context";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Chat" }];
}

export async function loader() {
  const chatId = "123e4567-e89b-12d3-a456-426614174091";
  const API_KEY =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MTMyNiwibWZhIjpmYWxzZSwibWZhVHlwZSI6bnVsbCwic3NvTG9naW4iOmZhbHNlLCJqdGkiOiI2OTQ1MjJkYWI0MDQ3NDkxNDEzNWZiZWUiLCJpYXQiOjE3NjYxMzg1ODYsIm5iZiI6MTc2NjEzODU4NiwiZXhwIjoxNzY2MjI0OTg2fQ.5r7-MydS9zytgQv-Er4ZUx02fzCtYPtD8d1IBS7prMU";
  const initialMessages = await fetch(
    `http://localhost:3000/chat/messages/${chatId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    }
  );
  const initialMessagesData = await initialMessages.json();
  return { initialMessagesData, chatId, API_KEY };
}

export default function Chat({ loaderData }: Route.ComponentProps) {
  const assistantContext = useMemo<AssistantPageContext>(() => {
    return {
      pageId: "chat-playground",
      title: "Chat Playground",
      description: "Standalone assistant workspace",
      summary:
        "The assistant is running without any dashboard context. Answer general or troubleshooting questions.",
      path: "/chat",
      timestamp: new Date().toISOString(),
    };
  }, []);

  return (
    <PageAssistantProvider value={assistantContext}>
      <ChatPanel
        initialMessagesData={loaderData.initialMessagesData.data}
        chatId={loaderData.chatId}
        API_KEY={loaderData.API_KEY}
      />
    </PageAssistantProvider>
  );
}
