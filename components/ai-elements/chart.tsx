"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { ComponentProps } from "react";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

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
  "#e76e50",
  "#2a9d90",
  "#264653",
  "#e9c46a",
  "#f4a462",
  "#8b5cf6",
  "#ec4899",
  "#22c55e",
];

const COLORS_ALPHA = COLORS.map((c) => `${c}cc`);

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

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        padding: 16,
        usePointStyle: true,
        font: { size: 12 },
      },
    },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: 12,
      cornerRadius: 8,
      titleFont: { size: 13 },
      bodyFont: { size: 12 },
    },
  },
};

const axisOptions = {
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: "rgba(0, 0, 0, 0.06)" },
      ticks: { font: { size: 11 } },
    },
  },
};

const ChartRenderer = ({ config }: { config: ChartInputConfig }) => {
  const { chartType, labels, datasets } = config;

  const isPieOrDoughnut = chartType === "pie" || chartType === "doughnut";

  const chartData = {
    labels,
    datasets: datasets.map((dataset, datasetIndex) => {
      const backgroundColor = dataset.backgroundColor?.length
        ? dataset.backgroundColor
        : isPieOrDoughnut
          ? COLORS_ALPHA.slice(0, labels.length)
          : [COLORS_ALPHA[datasetIndex % COLORS_ALPHA.length]];

      const borderColor = dataset.borderColor?.length
        ? dataset.borderColor
        : isPieOrDoughnut
          ? COLORS.slice(0, labels.length)
          : [COLORS[datasetIndex % COLORS.length]];

      const base = {
        label: dataset.label,
        data: dataset.data,
        backgroundColor,
        borderColor,
        borderWidth: 2,
      };

      if (chartType === "area") {
        return { ...base, fill: true, tension: 0.4 };
      }
      if (chartType === "line") {
        return { ...base, fill: false, tension: 0.3, pointRadius: 4, pointHoverRadius: 6 };
      }
      if (chartType === "bar") {
        return { ...base, borderRadius: 4 };
      }
      return base;
    }),
  };

  switch (chartType) {
    case "bar":
      return (
        <Bar
          data={chartData}
          options={{ ...commonOptions, ...axisOptions }}
        />
      );
    case "line":
    case "area":
      return (
        <Line
          data={chartData}
          options={{ ...commonOptions, ...axisOptions }}
        />
      );
    case "pie":
      return (
        <Pie
          data={chartData}
          options={commonOptions}
        />
      );
    case "doughnut":
      return (
        <Doughnut
          data={chartData}
          options={commonOptions}
        />
      );
    default:
      return null;
  }
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
            {isLoading ? <SkeletonBlock className="h-4 w-32" /> : chartTypeLabel}
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
