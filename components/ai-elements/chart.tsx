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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "~/components/ui/chart";
import type { ChartConfig } from "~/components/ui/chart";
import { cn } from "~/lib/utils";
import type { ComponentProps } from "react";

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
