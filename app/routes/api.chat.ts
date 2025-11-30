import { createAgentUIStreamResponse } from "ai";
import type { UIMessage } from "ai";
import type { Route } from "./+types/api.chat";
import {
  getActiveTraceId,
  observe,
  updateActiveObservation,
  updateActiveTrace,
} from "@langfuse/tracing";
import { trace } from "@opentelemetry/api";
import { LangfuseClient } from "@langfuse/client";
import { langfuseSpanProcessor } from "~/lib/langfuse.server";
import {
  parseAssistantPageContext,
  summarizeAssistantPageContext,
} from "~/lib/assistant-context";

import { agent, toTextContent } from "~/lib/agent";

const langfuse = new LangfuseClient();

type ChatRequestPayload = {
  messages: UIMessage[];
  model?: string;
  webSearch?: boolean;
  pageContext?: unknown;
};

const actionImpl = async ({ request }: Route.ActionArgs) => {
  try {
    const {
      messages,
      model = "gemini-2.5-flash",
      webSearch = false,
      pageContext: pageContextInput,
    }: ChatRequestPayload = await request.json();
    const pageContext = parseAssistantPageContext(pageContextInput);
    const pageContextSummary = summarizeAssistantPageContext(pageContext);

    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    const sessionId = messages[0]?.id;
    const lastUserText = toTextContent(lastUserMessage);

    updateActiveObservation({
      input: lastUserText,
      metadata: {
        model,
        ...(pageContext ? { pageId: pageContext.pageId } : {}),
      },
    });

    updateActiveTrace({
      name: "chat-api-trace",
      sessionId,
      input: lastUserText,
      metadata: {
        model,
        webSearch,
        ...(pageContext
          ? {
              pageContext: {
                pageId: pageContext.pageId,
                title: pageContext.title,
                filters: pageContext.filters,
              },
            }
          : {}),
      },
    });

    const prompt = await langfuse.prompt.get("Chat AI Prompt", {
      label: "production",
    });

    const compiledPrompt = prompt.compile({
      current_date: new Date().toLocaleString(),
      page_context: pageContextSummary ?? "",
    });

    const traceId = getActiveTraceId();
    const assistantMetadata =
      traceId || sessionId
        ? {
            ...(traceId ? { traceId } : {}),
            ...(sessionId ? { sessionId } : {}),
          }
        : undefined;

    return createAgentUIStreamResponse({
      agent,
      messages,
      options: {
        model,
        instruction: compiledPrompt,
        telemetry: {
          metadata: {
            model,
            webSearch,
            langfusePrompt: prompt.toJSON(),
            ...(pageContextSummary ? { pageContextSummary } : {}),
          },
        },
      },
      sendSources: true,
      sendReasoning: true,
      ...(assistantMetadata
        ? {
            messageMetadata: () => assistantMetadata,
          }
        : {}),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);

    updateActiveObservation({
      output: errorMessage,
      level: "ERROR",
    });
    updateActiveTrace({
      output: errorMessage,
    });

    trace.getActiveSpan()?.end();
    if (langfuseSpanProcessor) {
      await langfuseSpanProcessor.forceFlush();
    }

    throw error;
  }
};

export const action = observe(actionImpl, {
  name: "handle-chat-message",
  endOnExit: false,
});
