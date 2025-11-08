import type { Route } from "./+types/api.feedback";
import { LangfuseClient } from "@langfuse/client";
import { z } from "zod";
import { data } from "react-router";

const langfuse = new LangfuseClient();

const feedbackSchema = z.object({
  traceId: z.string().min(1),
  messageId: z.string().min(1),
  rating: z.enum(["up", "down"]),
  responseText: z.string().optional(),
});

export const action = async ({ request }: Route.ActionArgs) => {
  try {
    const jsonBody = await request.json();
    const parsed = feedbackSchema.safeParse(jsonBody);

    if (!parsed.success) {
      return data(
        {
          ok: false,
          error: "Invalid request payload",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { traceId, messageId, rating, responseText } = parsed.data;

    langfuse.score.create({
      traceId,
      name: "helpfulness",
      value: rating === "up" ? 1 : 0,
      comment:
        rating === "up"
          ? "User marked this response helpful"
          : "User marked this response unhelpful",
      metadata: {
        rating,
        messageId,
        responseText: responseText?.slice(0, 2000),
      },
    });

    await langfuse.score.flush();

    return data({ ok: true });
  } catch (error) {
    console.error("Unable to submit helpfulness score", error);
    return data(
      { ok: false, error: "Unable to submit helpfulness score" },
      { status: 500 }
    );
  }
};
