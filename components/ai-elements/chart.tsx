"use client";

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "~/components/ui/chart";
import type { ChartConfig } from "~/components/ui/chart";
import { cn } from "~/lib/utils";
import { useMemo, useState, type ComponentProps } from "react";

export type ChartType = "bar" | "line" | "pie" | "doughnut" | "area";

export type ChartDataset = {
  label: string;
  data: number[];
  backgroundColor?: string[];
  borderColor?: string[];
};

export type ChartInputConfig = {
  chartType: ChartType;
  title: string;
  labels: string[];
  datasets: ChartDataset[];
};

export type ChartCardProps = ComponentProps<typeof Card> & {
  config: ChartInputConfig;
  isLoading?: boolean;
};

export type TransactionStatusDoughnutConfig = {
  success?: boolean;
  label: string;
  chartType: "doughnut";
  chartData: {
    name: string; // status label (e.g., success, failed)
    count: number;
    volume: number;
    average: number;
    currency: string;
  }[];
  summary?: {
    totalCount?: number | null;
    totalVolume?: number | null;
    overallAverage?: number | null;
    perCurrency?: {
      currency: string;
      totalCount: number;
      totalVolume: number;
      overallAverage: number;
    }[];
  };
  message?: string;
};

// New multi-currency area chart config (keeps existing ChartCard untouched)
export type MultiCurrencyAreaChartConfig = {
  success?: boolean;
  label: string;
  chartType: "area";
  chartSeries: {
    currency: string;
    points: {
      name: string;
      count: number;
      volume: number;
      average: number;
      currency: string;
    }[];
  }[];
  summary?: {
    totalCount?: number | null;
    totalVolume?: number | null;
    overallAverage?: number | null;
    perCurrency?: {
      currency: string;
      totalCount: number;
      totalVolume: number;
      overallAverage: number;
    }[];
    dateRange?: { from: string; to: string };
  };
};

export type PreliminaryMultiCurrencyAreaChartConfig = {
  label: string;
  chartType: "area";
  loading: boolean;
  message: string;
};

const COLORS = [
  "hsl(12, 76%, 61%)", // #e76e50 - coral
  "hsl(172, 56%, 38%)", // #2a9d90 - teal
  "hsl(198, 50%, 23%)", // #264653 - dark blue
  "hsl(43, 74%, 66%)", // #e9c46a - yellow
  "hsl(27, 87%, 67%)", // #f4a462 - orange
  "hsl(258, 90%, 66%)", // #8b5cf6 - purple
  "hsl(330, 81%, 60%)", // #ec4899 - pink
  "hsl(142, 71%, 45%)", // #22c55e - green
];

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />
);

const ChartSkeleton = () => (
  <div className="flex h-full w-full flex-col gap-4 p-4">
    <div className="flex h-full gap-3">
      <div className="flex flex-col justify-between py-2">
        <SkeletonBlock className="h-3 w-6" />
        <SkeletonBlock className="h-3 w-6" />
        <SkeletonBlock className="h-3 w-6" />
        <SkeletonBlock className="h-3 w-6" />
      </div>
      <div className="flex flex-1 items-end justify-around gap-2">
        <SkeletonBlock className="h-[45%] w-full rounded-t" />
        <SkeletonBlock className="h-[70%] w-full rounded-t" />
        <SkeletonBlock className="h-[55%] w-full rounded-t" />
        <SkeletonBlock className="h-[85%] w-full rounded-t" />
        <SkeletonBlock className="h-[40%] w-full rounded-t" />
        <SkeletonBlock className="h-[60%] w-full rounded-t" />
        <SkeletonBlock className="h-[75%] w-full rounded-t" />
      </div>
    </div>
    <div className="flex justify-around gap-2 pl-9">
      <SkeletonBlock className="h-3 w-8" />
      <SkeletonBlock className="h-3 w-8" />
      <SkeletonBlock className="h-3 w-8" />
      <SkeletonBlock className="h-3 w-8" />
      <SkeletonBlock className="h-3 w-8" />
      <SkeletonBlock className="h-3 w-8" />
      <SkeletonBlock className="h-3 w-8" />
    </div>
  </div>
);

// Convert hex color to hsl if needed
const ensureHslColor = (
  color: string | undefined,
  fallbackIndex: number
): string => {
  if (!color) return COLORS[fallbackIndex % COLORS.length];

  // If already HSL, return as is
  if (color.startsWith("hsl")) return color;

  // If hex, convert to HSL or use fallback
  if (color.startsWith("#")) {
    // For simplicity, just use the fallback color
    // You could add a full hex-to-hsl converter if needed
    return COLORS[fallbackIndex % COLORS.length];
  }

  return color;
};

// Create a safe CSS variable name from a label
const createSafeKey = (label: string): string => {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

// Transform Chart.js format to Recharts format
const transformData = (config: ChartInputConfig) => {
  const { labels, datasets, chartType } = config;
  const isPieOrDoughnut = chartType === "pie" || chartType === "doughnut";

  if (isPieOrDoughnut && datasets.length > 0) {
    // For pie/doughnut charts, transform to Recharts format
    const dataset = datasets[0];
    return labels.map((label, index) => {
      const color = dataset.backgroundColor?.[index];
      const safeKey = createSafeKey(label);
      return {
        name: safeKey,
        originalLabel: label,
        value: dataset.data[index],
        fill: ensureHslColor(color, index),
      };
    });
  }

  // For bar/line/area charts
  return labels.map((label, index) => {
    const dataPoint: Record<string, string | number> = { name: label };
    datasets.forEach((dataset) => {
      // Use safe key for data object to match chartConfig
      const safeKey = createSafeKey(dataset.label);
      dataPoint[safeKey] = dataset.data[index];
    });
    return dataPoint;
  });
};

// Create chart config for shadcn charts
const createChartConfig = (config: ChartInputConfig): ChartConfig => {
  const { datasets, chartType } = config;
  const chartConfig: ChartConfig = {};

  if (chartType === "pie" || chartType === "doughnut") {
    // For pie charts, create config for each label
    config.labels.forEach((label, index) => {
      const dataset = datasets[0];
      const color = dataset.backgroundColor?.[index];
      const safeKey = createSafeKey(label);
      chartConfig[safeKey] = {
        label: label,
        color: ensureHslColor(color, index),
      };
    });
  } else {
    // For other charts, create config for each dataset
    datasets.forEach((dataset, index) => {
      const color = dataset.borderColor?.[0] || dataset.backgroundColor?.[0];
      const safeKey = createSafeKey(dataset.label);
      chartConfig[safeKey] = {
        label: dataset.label,
        color: ensureHslColor(color, index),
      };
    });
  }

  return chartConfig;
};

const ChartRenderer = ({ config }: { config: ChartInputConfig }) => {
  const { chartType, datasets } = config;
  const chartData = transformData(config);
  const chartConfig = createChartConfig(config);

  const isPieOrDoughnut = chartType === "pie" || chartType === "doughnut";

  if (isPieOrDoughnut) {
    return (
      <ChartContainer config={chartConfig} className="h-full w-full">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={chartType === "doughnut" ? "60%" : 0}
            strokeWidth={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={String(entry.fill)} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="name" />} />
        </PieChart>
      </ChartContainer>
    );
  }

  if (chartType === "bar") {
    return (
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="name"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={10} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {datasets.map((dataset) => {
            const safeKey = createSafeKey(dataset.label);
            return (
              <Bar
                key={dataset.label}
                dataKey={safeKey}
                fill={`var(--color-${safeKey})`}
                radius={[4, 4, 0, 0]}
              />
            );
          })}
        </BarChart>
      </ChartContainer>
    );
  }

  // Area charts
  if (chartType === "area") {
    return (
      <ChartContainer config={chartConfig} className="h-full w-full">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="name"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={10} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {datasets.map((dataset) => {
            const safeKey = createSafeKey(dataset.label);
            return (
              <Area
                key={dataset.label}
                type="monotone"
                dataKey={safeKey}
                stroke={`var(--color-${safeKey})`}
                fill={`var(--color-${safeKey})`}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            );
          })}
        </AreaChart>
      </ChartContainer>
    );
  }

  // Line charts (default fallback)
  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={10} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {datasets.map((dataset) => {
          const safeKey = createSafeKey(dataset.label);
          return (
            <Line
              key={dataset.label}
              type="monotone"
              dataKey={safeKey}
              stroke={`var(--color-${safeKey})`}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          );
        })}
      </LineChart>
    </ChartContainer>
  );
};

export const ChartCard = ({
  config,
  isLoading = false,
  className,
  ...props
}: ChartCardProps) => {
  const { chartType, title } = config;

  const chartTypeLabel = {
    bar: "Bar Chart",
    line: "Line Chart",
    pie: "Pie Chart",
    doughnut: "Doughnut Chart",
    area: "Area Chart",
  }[chartType];

  return (
    <Card className={cn("w-full m-3", className)} {...props}>
      <CardHeader className="pb-2">
        <div className="space-y-1">
          <CardTitle>
            {isLoading ? <SkeletonBlock className="h-5 w-48" /> : title}
          </CardTitle>
          <CardDescription>
            {isLoading ? (
              <SkeletonBlock className="h-4 w-32" />
            ) : (
              chartTypeLabel
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          {isLoading ? <ChartSkeleton /> : <ChartRenderer config={config} />}
        </div>
      </CardContent>
    </Card>
  );
};

// ---- Multi-currency area chart card (separate from existing ChartCard) ----

type MetricKey = "count" | "volume" | "average";

export type MultiCurrencyChartCardProps = ComponentProps<typeof Card> & {
  config: MultiCurrencyAreaChartConfig;
  defaultMetric?: MetricKey;
  isLoading?: boolean;
};

const metricLabels: Record<MetricKey, string> = {
  count: "Transaction Count",
  volume: "Total Volume",
  average: "Average Ticket",
};

const metricPrecision: Record<MetricKey, number> = {
  count: 0,
  volume: 0,
  average: 2,
};

const formatMetricValue = (
  value: number,
  metric: MetricKey,
  currency?: string
): string => {
  if (metric === "count") return Number(value).toLocaleString();

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: metricPrecision[metric],
    minimumFractionDigits: metricPrecision[metric],
  });

  return formatter.format(Number(value));
};

export const MultiCurrencyChartCard = ({
  config,
  defaultMetric = "count",
  isLoading = false,
  className,
  ...props
}: MultiCurrencyChartCardProps) => {
  const [metric, setMetric] = useState<MetricKey>(defaultMetric);

  const { chartSeries, label, summary } = config;

  // Build data rows keyed by date label, with one column per currency
  const { chartData, chartConfig, currencyByKey } = useMemo(() => {
    const nameOrder = Array.from(
      new Set(chartSeries.flatMap((series) => series.points.map((p) => p.name)))
    );

    const currencyByKeyLocal = new Map<string, string>();

    const configEntries: ChartConfig = {};

    chartSeries.forEach((series, seriesIndex) => {
      const safeKey = createSafeKey(series.currency);
      currencyByKeyLocal.set(safeKey, series.currency);
      configEntries[safeKey] = {
        label: series.currency,
        color: ensureHslColor(undefined, seriesIndex),
      };
    });

    const rows = nameOrder.map((name) => {
      const row: Record<string, string | number> = { name };
      chartSeries.forEach((series) => {
        const safeKey = createSafeKey(series.currency);
        const point = series.points.find((p) => p.name === name);
        row[safeKey] = point ? point[metric] ?? 0 : 0;
      });
      return row;
    });

    return { chartData: rows, chartConfig: configEntries, currencyByKey: currencyByKeyLocal };
  }, [chartSeries, metric]);

  const dateRangeLabel =
    summary?.dateRange?.from && summary?.dateRange?.to
      ? `${summary.dateRange.from} – ${summary.dateRange.to}`
      : undefined;

  const metricOptions: { key: MetricKey; label: string }[] = [
    { key: "count", label: "Count" },
    { key: "volume", label: "Volume" },
    { key: "average", label: "Average" },
  ];

  return (
    <Card className={cn("w-full m-3", className)} {...props}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>
              {isLoading ? <SkeletonBlock className="h-5 w-60" /> : label}
            </CardTitle>
            <CardDescription>
              {isLoading ? (
                <SkeletonBlock className="h-4 w-40" />
              ) : (
                dateRangeLabel ?? "Multi-currency daily metrics"
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {metricOptions.map((option) => (
              <Button
                key={option.key}
                size="sm"
                variant={metric === option.key ? "default" : "outline"}
                onClick={() => setMetric(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        const currency = currencyByKey.get(String(name));
                        return (
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="text-muted-foreground">
                              {currency ?? name}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {formatMetricValue(Number(value), metric, currency)}
                            </span>
                          </div>
                        );
                      }}
                      labelFormatter={(val) => `${metricLabels[metric]} on ${val}`}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {chartSeries.map((series) => {
                  const safeKey = createSafeKey(series.currency);
                  return (
                    <Area
                      key={series.currency}
                      type="monotone"
                      dataKey={safeKey}
                      stroke={`var(--color-${safeKey})`}
                      fill={`var(--color-${safeKey})`}
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                  );
                })}
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ---- Transaction status doughnut chart (separate component) ----

type DoughnutMetric = "count" | "volume" | "average";

const doughnutMetricLabels: Record<DoughnutMetric, string> = {
  count: "Transaction Count",
  volume: "Total Volume",
  average: "Average Ticket",
};

const doughnutMetricPrecision: Record<DoughnutMetric, number> = {
  count: 0,
  volume: 0,
  average: 2,
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export type TransactionStatusDoughnutCardProps = ComponentProps<typeof Card> & {
  config: TransactionStatusDoughnutConfig;
  defaultMetric?: DoughnutMetric;
  isLoading?: boolean;
};

export const TransactionStatusDoughnutCard = ({
  config,
  defaultMetric = "count",
  isLoading = false,
  className,
  ...props
}: TransactionStatusDoughnutCardProps) => {
  const [metric, setMetric] = useState<DoughnutMetric>(defaultMetric);
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");

  const currencies = useMemo(
    () => ["all", ...new Set(config.chartData.map((d) => d.currency))],
    [config.chartData]
  );

  const displayCurrency = useMemo(
    () =>
      currencyFilter !== "all"
        ? currencyFilter
        : config.summary?.perCurrency?.[0]?.currency ||
          config.chartData[0]?.currency ||
          "USD",
    [config.chartData, config.summary, currencyFilter]
  );

  const aggregated = useMemo(() => {
    const filtered = config.chartData.filter(
      (d) => currencyFilter === "all" || d.currency === currencyFilter
    );

    const byStatus = new Map<
      string,
      { count: number; volume: number; weightedVolume: number; weightedCount: number }
    >();

    filtered.forEach((item) => {
      const current = byStatus.get(item.name) ?? {
        count: 0,
        volume: 0,
        weightedVolume: 0,
        weightedCount: 0,
      };
      current.count += item.count || 0;
      current.volume += item.volume || 0;
      // weighted fields for average (volume / count)
      current.weightedVolume += (item.volume || 0);
      current.weightedCount += (item.count || 0);
      byStatus.set(item.name, current);
    });

    const entries = Array.from(byStatus.entries()).map(([status, totals], i) => {
      const value =
        metric === "count"
          ? totals.count
          : metric === "volume"
            ? totals.volume
            : totals.weightedCount > 0
              ? totals.weightedVolume / totals.weightedCount
              : 0;

      return {
        name: status,
        value,
        fill: ensureHslColor(undefined, i),
      };
    });

    return entries;
  }, [config.chartData, currencyFilter, metric]);

  const chartConfig = useMemo(() => {
    return aggregated.reduce((acc, slice) => {
      acc[slice.name] = {
        label: capitalize(slice.name),
        color: slice.fill,
      };
      return acc;
    }, {} as ChartConfig);
  }, [aggregated]);

  const hasData = aggregated.length > 0 && aggregated.some((d) => d.value > 0);

  const metricButtons: { key: DoughnutMetric; label: string }[] = [
    { key: "count", label: "Count" },
    { key: "volume", label: "Volume" },
    { key: "average", label: "Average" },
  ];

  return (
    <Card className={cn("w-full m-3", className)} {...props}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>
              {isLoading ? (
                <SkeletonBlock className="h-5 w-56" />
              ) : (
                config.label
              )}
            </CardTitle>
            <CardDescription>
              {isLoading ? (
                <SkeletonBlock className="h-4 w-44" />
              ) : (
                `${doughnutMetricLabels[metric]}${
                  currencyFilter !== "all" ? ` • ${currencyFilter}` : ""
                }`
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {metricButtons.map((btn) => (
              <Button
                key={btn.key}
                size="sm"
                variant={metric === btn.key ? "default" : "outline"}
                onClick={() => setMetric(btn.key)}
              >
                {btn.label}
              </Button>
            ))}
            {currencies.map((cur) => (
              <Button
                key={cur}
                size="sm"
                variant={currencyFilter === cur ? "default" : "outline"}
                onClick={() => setCurrencyFilter(cur)}
              >
                {cur === "all" ? "All" : cur}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          {isLoading ? (
            <ChartSkeleton />
          ) : hasData ? (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      hideIndicator
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            {capitalize(String(name))}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {metric === "count"
                              ? Number(value).toLocaleString()
                              : new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: displayCurrency,
                                  maximumFractionDigits:
                                    doughnutMetricPrecision[metric],
                                  minimumFractionDigits:
                                    doughnutMetricPrecision[metric],
                                }).format(Number(value))}
                          </span>
                        </div>
                      )}
                      labelFormatter={(_, payload) => {
                        const name =
                          payload?.[0]?.payload?.name ??
                          payload?.[0]?.name ??
                          "Value";
                        return `${doughnutMetricLabels[metric]} • ${capitalize(
                          String(name)
                        )}`;
                      }}
                    />
                  }
                />
                <Pie
                  data={aggregated}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="60%"
                  strokeWidth={2}
                >
                  {aggregated.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={String(entry.fill)} />
                  ))}
                </Pie>
                <ChartLegend
                  verticalAlign="bottom"
                  content={<ChartLegendContent nameKey="name" />}
                />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No data to display.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
