import type { Route } from "./+types/chat";
import { useMemo } from "react";
import { ChatPanel } from "~/components/chat/chat-panel";
import { PageAssistantProvider } from "~/components/assistant/page-assistant-context";
import type { AssistantPageContext } from "~/lib/assistant-context";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Chat" }];
}

export default function Chat() {
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
      <ChatPanel />
    </PageAssistantProvider>
  );
}
