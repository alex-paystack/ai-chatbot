// Transaction type based on your schema
export type Transaction = {
  id: string;
  amount: number;
  status: "success" | "failed" | "abandoned";
  createdAt: string;
  currency: string;
  gateway_response: string;
  customer: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
};

type ChartData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
  }[];
};

// Color palettes
const STATUS_COLORS = {
  success: "rgba(34, 197, 94, 0.8)", // green
  failed: "rgba(239, 68, 68, 0.8)", // red
  abandoned: "rgba(251, 146, 60, 0.8)", // orange
};

const DEFAULT_CHART_COLORS = [
  "rgba(99, 102, 241, 0.8)", // indigo
  "rgba(139, 92, 246, 0.8)", // violet
  "rgba(236, 72, 153, 0.8)", // pink
  "rgba(34, 211, 238, 0.8)", // cyan
  "rgba(52, 211, 153, 0.8)", // emerald
  "rgba(251, 191, 36, 0.8)", // amber
  "rgba(248, 113, 113, 0.8)", // red
];

/**
 * Aggregate transactions by status
 */
function aggregateByStatus(
  transactions: Transaction[],
  metric: "count" | "volume" | "average"
): ChartData {
  const grouped = transactions.reduce(
    (acc, txn) => {
      if (!acc[txn.status]) {
        acc[txn.status] = { count: 0, total: 0 };
      }
      acc[txn.status].count++;
      acc[txn.status].total += txn.amount;
      return acc;
    },
    {} as Record<string, { count: number; total: number }>
  );

  const statuses = ["success", "failed", "abandoned"] as const;
  const labels = statuses.map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  const data = statuses.map((status) => {
    const group = grouped[status] || { count: 0, total: 0 };
    switch (metric) {
      case "count":
        return group.count;
      case "volume":
        return group.total / 100; // Convert from cents to dollars
      case "average":
        return group.count > 0 ? group.total / group.count / 100 : 0;
    }
  });

  const metricLabels = {
    count: "Transaction Count",
    volume: "Total Volume ($)",
    average: "Average Amount ($)",
  };

  return {
    labels,
    datasets: [
      {
        label: metricLabels[metric],
        data,
        backgroundColor: statuses.map((s) => STATUS_COLORS[s]),
      },
    ],
  };
}

/**
 * Aggregate transactions by day
 */
function aggregateByDay(
  transactions: Transaction[],
  metric: "count" | "volume" | "average"
): ChartData {
  const grouped = transactions.reduce(
    (acc, txn) => {
      const date = new Date(txn.createdAt);
      const dayKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!acc[dayKey]) {
        acc[dayKey] = { count: 0, total: 0, date };
      }
      acc[dayKey].count++;
      acc[dayKey].total += txn.amount;
      return acc;
    },
    {} as Record<string, { count: number; total: number; date: Date }>
  );

  // Sort by date
  const sorted = Object.entries(grouped).sort(
    ([, a], [, b]) => a.date.getTime() - b.date.getTime()
  );

  const labels = sorted.map(([dayKey]) => {
    const date = new Date(dayKey);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const data = sorted.map(([, group]) => {
    switch (metric) {
      case "count":
        return group.count;
      case "volume":
        return group.total / 100;
      case "average":
        return group.count > 0 ? group.total / group.count / 100 : 0;
    }
  });

  const metricLabels = {
    count: "Daily Transaction Count",
    volume: "Daily Volume ($)",
    average: "Daily Average ($)",
  };

  return {
    labels,
    datasets: [
      {
        label: metricLabels[metric],
        data,
      },
    ],
  };
}

/**
 * Aggregate transactions by hour of day
 */
function aggregateByHour(
  transactions: Transaction[],
  metric: "count" | "volume" | "average"
): ChartData {
  const grouped = transactions.reduce(
    (acc, txn) => {
      const date = new Date(txn.createdAt);
      const hour = date.getHours();

      if (!acc[hour]) {
        acc[hour] = { count: 0, total: 0 };
      }
      acc[hour].count++;
      acc[hour].total += txn.amount;
      return acc;
    },
    {} as Record<number, { count: number; total: number }>
  );

  // Create array for all 24 hours
  const labels = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 || 12;
    const period = i < 12 ? "AM" : "PM";
    return `${hour}${period}`;
  });

  const data = Array.from({ length: 24 }, (_, hour) => {
    const group = grouped[hour] || { count: 0, total: 0 };
    switch (metric) {
      case "count":
        return group.count;
      case "volume":
        return group.total / 100;
      case "average":
        return group.count > 0 ? group.total / group.count / 100 : 0;
    }
  });

  const metricLabels = {
    count: "Transactions by Hour",
    volume: "Volume by Hour ($)",
    average: "Average by Hour ($)",
  };

  return {
    labels,
    datasets: [
      {
        label: metricLabels[metric],
        data,
      },
    ],
  };
}

/**
 * Aggregate transactions by week
 */
function aggregateByWeek(
  transactions: Transaction[],
  metric: "count" | "volume" | "average"
): ChartData {
  const grouped = transactions.reduce(
    (acc, txn) => {
      const date = new Date(txn.createdAt);

      // Get week number (simple calculation)
      const yearStart = new Date(date.getFullYear(), 0, 1);
      const weekNum = Math.ceil(
        ((date.getTime() - yearStart.getTime()) / 86400000 +
          yearStart.getDay() +
          1) /
          7
      );
      const weekKey = `${date.getFullYear()}-W${weekNum}`;

      if (!acc[weekKey]) {
        acc[weekKey] = {
          count: 0,
          total: 0,
          weekNum,
          year: date.getFullYear(),
        };
      }
      acc[weekKey].count++;
      acc[weekKey].total += txn.amount;
      return acc;
    },
    {} as Record<
      string,
      { count: number; total: number; weekNum: number; year: number }
    >
  );

  // Sort by week
  const sorted = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  const labels = sorted.map(([, group]) => `Week ${group.weekNum}`);

  const data = sorted.map(([, group]) => {
    switch (metric) {
      case "count":
        return group.count;
      case "volume":
        return group.total / 100;
      case "average":
        return group.count > 0 ? group.total / group.count / 100 : 0;
    }
  });

  const metricLabels = {
    count: "Weekly Transaction Count",
    volume: "Weekly Volume ($)",
    average: "Weekly Average ($)",
  };

  return {
    labels,
    datasets: [
      {
        label: metricLabels[metric],
        data,
      },
    ],
  };
}

/**
 * Aggregate transactions by day of week
 */
function aggregateByDayOfWeek(
  transactions: Transaction[],
  metric: "count" | "volume" | "average"
): ChartData {
  const grouped = transactions.reduce(
    (acc, txn) => {
      const date = new Date(txn.createdAt);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

      if (!acc[dayOfWeek]) {
        acc[dayOfWeek] = { count: 0, total: 0 };
      }
      acc[dayOfWeek].count++;
      acc[dayOfWeek].total += txn.amount;
      return acc;
    },
    {} as Record<number, { count: number; total: number }>
  );

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const labels = dayNames;

  const data = Array.from({ length: 7 }, (_, day) => {
    const group = grouped[day] || { count: 0, total: 0 };
    switch (metric) {
      case "count":
        return group.count;
      case "volume":
        return group.total / 100;
      case "average":
        return group.count > 0 ? group.total / group.count / 100 : 0;
    }
  });

  const metricLabels = {
    count: "Transactions by Day of Week",
    volume: "Volume by Day of Week ($)",
    average: "Average by Day of Week ($)",
  };

  return {
    labels,
    datasets: [
      {
        label: metricLabels[metric],
        data,
        backgroundColor: DEFAULT_CHART_COLORS,
      },
    ],
  };
}

/**
 * Aggregate transactions by month
 */
function aggregateByMonth(
  transactions: Transaction[],
  metric: "count" | "volume" | "average"
): ChartData {
  const grouped = transactions.reduce(
    (acc, txn) => {
      const date = new Date(txn.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!acc[monthKey]) {
        acc[monthKey] = { count: 0, total: 0, date };
      }
      acc[monthKey].count++;
      acc[monthKey].total += txn.amount;
      return acc;
    },
    {} as Record<string, { count: number; total: number; date: Date }>
  );

  // Sort by month
  const sorted = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  const labels = sorted.map(([monthKey]) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  });

  const data = sorted.map(([, group]) => {
    switch (metric) {
      case "count":
        return group.count;
      case "volume":
        return group.total / 100;
      case "average":
        return group.count > 0 ? group.total / group.count / 100 : 0;
    }
  });

  const metricLabels = {
    count: "Monthly Transaction Count",
    volume: "Monthly Volume ($)",
    average: "Monthly Average ($)",
  };

  return {
    labels,
    datasets: [
      {
        label: metricLabels[metric],
        data,
      },
    ],
  };
}

/**
 * Main aggregation function
 */
export function aggregateTransactionData(
  transactions: Transaction[],
  analysisType:
    | "by-day"
    | "by-status"
    | "by-hour"
    | "by-week"
    | "by-day-of-week"
    | "by-month",
  metric: "count" | "volume" | "average"
): ChartData {
  switch (analysisType) {
    case "by-status":
      return aggregateByStatus(transactions, metric);
    case "by-day":
      return aggregateByDay(transactions, metric);
    case "by-hour":
      return aggregateByHour(transactions, metric);
    case "by-week":
      return aggregateByWeek(transactions, metric);
    case "by-day-of-week":
      return aggregateByDayOfWeek(transactions, metric);
    case "by-month":
      return aggregateByMonth(transactions, metric);
  }
}

/**
 * Generate a descriptive title for the chart
 */
export function generateChartTitle(
  analysisType: string,
  metric: string,
  startDate: string,
  endDate: string
): string {
  const metricText =
    {
      count: "Transaction Count",
      volume: "Transaction Volume",
      average: "Average Transaction Amount",
    }[metric] || "Transactions";

  const analysisText =
    {
      "by-status": "by Status",
      "by-day": "by Day",
      "by-hour": "by Hour of Day",
      "by-week": "by Week",
      "by-day-of-week": "by Day of Week",
      "by-month": "by Month",
    }[analysisType] || "";

  const start = new Date(startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = new Date(endDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${metricText} ${analysisText} (${start} - ${end})`;
}

/**
 * Suggest appropriate chart type based on analysis
 */
export function suggestChartType(
  analysisType: string
): "bar" | "line" | "pie" | "doughnut" | "area" {
  switch (analysisType) {
    case "by-status":
      return "doughnut"; // Good for proportions
    case "by-day":
    case "by-week":
    case "by-month":
      return "line"; // Good for time series
    case "by-hour":
    case "by-day-of-week":
      return "bar"; // Good for categorical comparison
    default:
      return "bar";
  }
}
