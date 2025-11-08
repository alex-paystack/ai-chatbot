import { convertToModelMessages, streamText, tool, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import type { Route } from "./+types/api.chat";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  getActiveTraceId,
  observe,
  updateActiveObservation,
  updateActiveTrace,
} from "@langfuse/tracing";
import { trace } from "@opentelemetry/api";
import { LangfuseClient } from "@langfuse/client";
import { langfuseSpanProcessor } from "~/lib/langfuse.server";

const langfuse = new LangfuseClient();

type TextPart = { type: "text"; text: string };

const isTextPart = (part: unknown): part is TextPart =>
  typeof part === "object" &&
  part !== null &&
  "type" in part &&
  (part as { type?: unknown }).type === "text" &&
  typeof (part as { text?: unknown }).text === "string";

const joinTextFromParts = (parts?: unknown[]): string | undefined => {
  if (!parts?.length) {
    return undefined;
  }

  const text = parts
    .filter(isTextPart)
    .map((part) => part.text)
    .join("\n")
    .trim();

  return text.length > 0 ? text : undefined;
};

const toTextContent = (message?: UIMessage) => {
  if (!message) return undefined;
  const asAny = message as UIMessage & {
    content?: unknown;
    parts?: { type: string; text?: string }[];
  };

  const parts = Array.isArray(asAny.parts)
    ? (asAny.parts as unknown[])
    : Array.isArray(asAny.content)
      ? (asAny.content as unknown[])
      : undefined;

  const textFromParts = joinTextFromParts(parts);
  if (textFromParts) {
    return textFromParts;
  }

  if (typeof asAny.content === "string") {
    const trimmed = asAny.content.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
};

const toTextFromContent = (content: unknown): string | undefined => {
  if (Array.isArray(content)) {
    const text = joinTextFromParts(content as unknown[]);
    if (text) {
      return text;
    }
  }

  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
};

const actionImpl = async ({ request }: Route.ActionArgs) => {
  try {
    const {
      messages,
      model,
      webSearch,
    }: {
      messages: UIMessage[];
      model: string;
      webSearch: boolean;
    } = await request.json();

    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    const sessionId = messages[0]?.id;
    const lastUserText = toTextContent(lastUserMessage);

    updateActiveObservation({
      input: lastUserText,
      metadata: {
        model,
      },
    });

    updateActiveTrace({
      name: "chat-api-trace",
      sessionId,
      input: lastUserText,
      metadata: {
        model,
        webSearch,
      },
    });

    const prompt = await langfuse.prompt.get("System prompt", {
      label: "production",
    });

    const traceId = getActiveTraceId();
    const assistantMetadata =
      traceId || sessionId
        ? {
            ...(traceId ? { traceId } : {}),
            ...(sessionId ? { sessionId } : {}),
          }
        : undefined;

    const result = streamText({
      model: model === "gpt-5" ? openai("gpt-4o") : google(model),
      messages: convertToModelMessages(messages),
      system: prompt.prompt,
      stopWhen: stepCountIs(10),
      experimental_telemetry: {
        isEnabled: true,
        functionId: "chat-api",
        metadata: {
          model,
          webSearch,
          langfusePrompt: prompt.toJSON(),
        },
      },
      tools: {
        getTransactions: tool({
          description: "Get the transactions for a specific time period",
          inputSchema: z.object({
            startDate: z.string().describe("The start date of the time period"),
            endDate: z.string().describe("The end date of the time period"),
          }),
          outputSchema: z.object({
            status: z.boolean(),
            message: z.string(),
            data: z.array(
              z.object({
                id: z.string(),
                amount: z.number(),
                status: z.enum(["success", "failed", "abandoned"]),
                createdAt: z.string(),
                currency: z.string(),
                gateway_response: z.string(),
                customer: z.object({
                  email: z.string(),
                  first_name: z.string(),
                  last_name: z.string(),
                  phone: z.string(),
                }),
              })
            ),
            meta: z.object({
              total: z.number(),
              total_volume: z.number(),
            }),
          }),
          execute: async ({ startDate, endDate }) => {
            const response = await fetch(
              `https://studio-api.paystack.co/transaction?reduced_fields=true&from=${startDate}&to=${endDate}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.PAYSTACK_JWT}`,
                  "jwt-auth": "true",
                },
              }
            );
            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload.message);
            }
            return payload;
          },
        }),
      },
      onFinish: async (payload) => {
        const content = payload?.content;
        const outputText = toTextFromContent(content);

        updateActiveObservation({
          output: outputText,
        });
        updateActiveTrace({
          output: outputText,
        });

        trace.getActiveSpan()?.end();
        if (langfuseSpanProcessor) {
          await langfuseSpanProcessor.forceFlush();
        }
      },
      onError: async (error) => {
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
      },
    });

    return result.toUIMessageStreamResponse({
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
