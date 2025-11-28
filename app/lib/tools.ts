import { tool } from "ai";
import { z } from "zod";
import { fetchTransactions } from "~/lib/transactions.server";
import {
  aggregateTransactionData,
  aggregateTransactionDataWithMetricComparison,
  generateChartTitle,
  generateMetricComparisonChartTitle,
  suggestChartType,
} from "~/lib/chart-aggregations";
import type { Transaction } from "./chart-aggregations";

export const analyzeAndVisualizeTransactions = tool({
  description: `Fetch and visualize transaction data with charts. Use this when users ask about:
- Patterns or trends over time (e.g., "What are my busiest days?", "Show me trends this month")
- Comparisons (e.g., "Compare success vs failed transactions")
- Breakdowns by time period (day, week, month, hour)
- Transaction status distribution
- Volume or revenue analysis

The tool will automatically aggregate the data and return chart-ready results.
Chart types are automatically selected: area charts for time series (by-day, by-week, by-month), bar charts for categorical data (by-hour, by-day-of-week), and doughnut charts for proportions (by-status).`,

  inputSchema: z.object({
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
    analysisType: z
      .enum([
        "by-day",
        "by-status",
        "by-hour",
        "by-week",
        "by-day-of-week",
        "by-month",
      ])
      .describe(
        `How to group the data:
- 'by-day': Daily trends (use for "show me daily transactions")
- 'by-status': Success vs Failed vs Abandoned (use for "transaction status breakdown")
- 'by-hour': Hourly patterns (use for "what are my busiest hours?")
- 'by-week': Weekly trends (use for longer time periods)
- 'by-day-of-week': Mon-Sun patterns (use for "which day of the week is busiest?")
- 'by-month': Monthly trends (use for year-long analysis)`
      ),
    metric: z.enum(["count", "volume", "average"]).describe(
      `What to measure:
- 'count': Number of transactions
- 'volume': Total dollar amount
- 'average': Average transaction amount`
    ),
    chartType: z
      .enum(["bar", "line", "pie", "doughnut", "area"])
      .optional()
      .describe(
        "Optional: Override the automatic chart type selection. If omitted, an appropriate type will be chosen (area for time series, bar for categorical, doughnut for proportions)."
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    chartConfig: z.object({
      chartType: z.enum(["bar", "line", "pie", "doughnut", "area"]),
      title: z.string(),
      labels: z.array(z.string()),
      datasets: z.array(
        z.object({
          label: z.string(),
          data: z.array(z.number()),
          backgroundColor: z.array(z.string()).optional(),
        })
      ),
    }),
    summary: z.object({
      totalTransactions: z.number(),
      totalVolume: z.number(),
      dateRange: z.string(),
    }),
  }),
  execute: async function* ({
    startDate,
    endDate,
    analysisType,
    metric,
    chartType,
  }) {
    yield {
      success: false,
      chartConfig: {
        chartType: "bar",
        title: "Loading...",
        labels: [],
        datasets: [],
      },
      summary: {
        totalTransactions: 0,
        totalVolume: 0,
        dateRange: `${startDate} to ${endDate}`,
      },
    };

    const { raw } = await fetchTransactions({
      startDate,
      endDate,
      perPage: 1000, // Increased since we're processing in code
    });

    // Step 3: Aggregate data using deterministic code functions
    const chartData = aggregateTransactionData(
      raw.data as Transaction[],
      analysisType,
      metric
    );

    // Step 4: Generate title and determine chart type
    const title = generateChartTitle(analysisType, metric, startDate, endDate);
    const suggestedChartType = chartType || suggestChartType(analysisType);

    yield {
      success: true,
      chartConfig: {
        chartType: suggestedChartType,
        title,
        labels: chartData.labels,
        datasets: chartData.datasets,
      },
      summary: {
        totalTransactions: raw.meta?.total || 0,
        totalVolume: raw.meta?.total_volume || 0 / 100, // Convert cents to dollars
        dateRange: `${startDate} to ${endDate}`,
      },
    };
  },
});

export const getTransactions = tool({
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
    meta: z
      .object({
        total: z.number(),
        total_volume: z.number(),
      })
      .passthrough(),
  }),
  execute: async function* ({ startDate, endDate }) {
    yield {
      status: true,
      message: "Fetching transactions…",
      data: [],
      meta: {
        total: 0,
        total_volume: 0,
      },
    } as const;

    const { raw } = await fetchTransactions({
      startDate,
      endDate,
      perPage: 50,
    });

    yield raw;
  },
});

export const compareTransactionMetrics = tool({
  description: `Compare different transaction metrics on a single chart for a time period. Use this when users ask to:
- Compare transaction volume vs transaction count (e.g., "Show me volume and count together")
- Compare multiple metrics like volume, count, and average
- See how different transaction properties relate to each other over time

This tool creates a chart with multiple datasets, one for each metric being compared.

IMPORTANT: For comparing time periods (like "January vs February"), create separate charts instead of using this tool.`,

  inputSchema: z.object({
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
    analysisType: z
      .enum(["by-day", "by-hour", "by-week", "by-day-of-week", "by-month"])
      .describe(
        `How to group the data:
- 'by-day': Daily trends
- 'by-hour': Hourly patterns
- 'by-week': Weekly trends
- 'by-day-of-week': Patterns by day of week (Mon-Sun)
- 'by-month': Monthly trends`
      ),
    metrics: z
      .array(z.enum(["count", "volume", "average"]))
      .min(2)
      .max(3)
      .describe(
        `Array of 2-3 metrics to compare on the same chart:
- 'count': Number of transactions
- 'volume': Total dollar amount
- 'average': Average transaction amount`
      ),
    chartType: z
      .enum(["bar", "line", "area"])
      .optional()
      .describe(
        "Optional: Chart type for comparison. Area charts work well for metric comparisons. Defaults to 'area'."
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    chartConfig: z.object({
      chartType: z.enum(["bar", "line", "pie", "doughnut", "area"]),
      title: z.string(),
      labels: z.array(z.string()),
      datasets: z.array(
        z.object({
          label: z.string(),
          data: z.array(z.number()),
          backgroundColor: z.array(z.string()).optional(),
        })
      ),
    }),
    summary: z.object({
      totalTransactions: z.number(),
      totalVolume: z.number(),
      dateRange: z.string(),
      metricsCompared: z.array(z.string()),
    }),
  }),
  execute: async function* ({
    startDate,
    endDate,
    analysisType,
    metrics,
    chartType,
  }) {
    yield {
      success: false,
      chartConfig: {
        chartType: "line" as const,
        title: "Loading comparison...",
        labels: [],
        datasets: [],
      },
      summary: {
        totalTransactions: 0,
        totalVolume: 0,
        dateRange: `${startDate} to ${endDate}`,
        metricsCompared: metrics,
      },
    };

    // Fetch transactions for the period
    const { raw } = await fetchTransactions({
      startDate,
      endDate,
      perPage: 1000,
    });

    // Aggregate data comparing multiple metrics
    const chartData = aggregateTransactionDataWithMetricComparison(
      raw.data as Transaction[],
      analysisType,
      metrics
    );

    // Generate title
    const title = generateMetricComparisonChartTitle(analysisType, metrics);
    const selectedChartType = chartType || "area";

    yield {
      success: true,
      chartConfig: {
        chartType: selectedChartType,
        title,
        labels: chartData.labels,
        datasets: chartData.datasets,
      },
      summary: {
        totalTransactions: raw.meta?.total || 0,
        totalVolume: raw.meta?.total_volume || 0 / 100,
        dateRange: `${startDate} to ${endDate}`,
        metricsCompared: metrics,
      },
    };
  },
});
