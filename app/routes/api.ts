import {
  convertToModelMessages,
  type UIMessage,
  streamText,
  tool,
  stepCountIs,
} from "ai";
import type { Route } from "./+types/api";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export async function action({ request }: Route.ActionArgs) {
  const {
    messages,
    model,
    webSearch,
  }: {
    messages: UIMessage[];
    model: string;
    webSearch: boolean;
  } = await request.json();

  const result = streamText({
    model: model === "gpt-5" ? openai("gpt-4o") : google(model),
    messages: convertToModelMessages(messages),
    system:
      "You are a helpful assistant that can answer questions and help with tasks",
    stopWhen: stepCountIs(10),
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
          console.log(startDate, endDate, process.env.PAYSTACK_JWT);
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
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
