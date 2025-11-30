import { ToolLoopAgent, createAgentUIStreamResponse, type UIMessage } from "ai";
import {
  analyzeAndVisualizeTransactions,
  compareTransactionMetrics,
  getTransactions,
} from "./tools";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { updateActiveObservation, updateActiveTrace } from "@langfuse/tracing";
import { langfuseSpanProcessor } from "./langfuse.server";
import { trace } from "@opentelemetry/api";

type TextPart = { type: "text"; text: string };

export const toTextContent = (message?: UIMessage) => {
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

export const isTextPart = (part: unknown): part is TextPart =>
  typeof part === "object" &&
  part !== null &&
  "type" in part &&
  (part as { type?: unknown }).type === "text" &&
  typeof (part as { text?: unknown }).text === "string";

export const joinTextFromParts = (parts?: unknown[]): string | undefined => {
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

export const toTextFromContent = (content: unknown): string | undefined => {
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

export const agent = new ToolLoopAgent({
  model: google("gemini-2.5-flash"),
  callOptionsSchema: z.object({
    model: z.string(),
    instruction: z.string(),
    telemetry: z.object({
      metadata: z.record(z.string(), z.union([z.string(), z.boolean()])),
    }),
  }),
  providerOptions: {
    openai: {
      reasoningSummary: "auto",
    },
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
  prepareCall: async ({ options, ...settings }) => {
    const model =
      options.model === "gpt-5-mini"
        ? openai("gpt-5-codex")
        : google(options.model);

    return {
      ...settings,
      instruction: options.instruction,
      model,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "chat-api",
        metadata: options.telemetry.metadata,
      },
    };
  },
  tools: {
    analyzeAndVisualizeTransactions,
    compareTransactionMetrics,
    getTransactions,
  },
});
