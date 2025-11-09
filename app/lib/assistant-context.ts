import { z } from "zod";

export const assistantPageContextSchema = z.object({
  pageId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  summary: z.string().optional(),
  path: z.string().optional(),
  timestamp: z.string().optional(),
  filters: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .optional(),
  stats: z
    .record(z.string(), z.union([z.string(), z.number()]))
    .optional(),
  table: z
    .object({
      columns: z.array(z.string()).default([]),
      visibleCount: z.number().int().nonnegative().optional(),
      rows: z
        .array(
          z.object({
            id: z.string().optional(),
            values: z.record(z.string(), z.union([z.string(), z.number()])),
            note: z.string().optional(),
          })
        )
        .max(100)
        .optional(),
    })
    .optional(),
  highlights: z.array(z.string()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type AssistantPageContext = z.infer<typeof assistantPageContextSchema>;

export const parseAssistantPageContext = (
  input: unknown
): AssistantPageContext | undefined => {
  if (!input) return undefined;
  const parsed = assistantPageContextSchema.safeParse(input);
  return parsed.success ? parsed.data : undefined;
};

export const summarizeAssistantPageContext = (
  context?: AssistantPageContext
): string | undefined => {
  if (!context) return undefined;

  const lines: string[] = [];
  const titleLine = `${context.title}${context.path ? ` (${context.path})` : ""}`;
  lines.push(`Page: ${titleLine}`);

  if (context.description) {
    lines.push(context.description);
  }

  if (context.summary) {
    lines.push(context.summary);
  }

  if (context.timestamp) {
    lines.push(`Snapshot taken at ${context.timestamp}`);
  }

  if (context.filters && Object.keys(context.filters).length > 0) {
    const filterEntries = Object.entries(context.filters)
      .map(([key, value]) => {
        const valueText = Array.isArray(value) ? value.join(", ") : value;
        return `${key}: ${valueText}`;
      })
      .join("; ");
    lines.push(`Active filters — ${filterEntries}`);
  }

  if (context.stats && Object.keys(context.stats).length > 0) {
    const statEntries = Object.entries(context.stats)
      .map(([key, value]) => `${key}: ${value}`)
      .join("; ");
    lines.push(`Key metrics — ${statEntries}`);
  }

  if (context.table) {
    const { columns, rows, visibleCount } = context.table;
    if (columns.length > 0) {
      lines.push(`Visible table columns: ${columns.join(", ")}`);
    }

    if (rows && rows.length > 0) {
      const sampleRows = rows.slice(0, 5).map((row, index) => {
        const values = Object.entries(row.values)
          .map(([key, value]) => `${key}=${value}`)
          .join(", ");
        const prefix = row.id ?? `Row ${index + 1}`;
        return `${prefix}: ${values}`;
      });
      lines.push(
        `Sample rows (showing ${sampleRows.length} of ${visibleCount ?? rows.length} visible):\n${sampleRows.join("\n")}`
      );
    }
  }

  if (context.highlights && context.highlights.length > 0) {
    lines.push(`Highlights: ${context.highlights.join(" | ")}`);
  }

  return lines.join("\n");
};
