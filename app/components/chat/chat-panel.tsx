import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useChat } from "@ai-sdk/react";
import { type FileUIPart, type UIMessage, DefaultChatTransport } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../../../components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "../../../components/ai-elements/message";
import {
  PromptInput,
  PromptInputInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputSpeechButton,
} from "../../../components/ai-elements/prompt-input";
import type { PromptInputMessage } from "../../../components/ai-elements/prompt-input";
import {
  Suggestion,
  Suggestions,
} from "../../../components/ai-elements/suggestion";
import {
  CopyIcon,
  GlobeIcon,
  RefreshCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "../../../components/ai-elements/sources";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../../../components/ai-elements/reasoning";
import { Shimmer } from "../../../components/ai-elements/shimmer";
import { TransactionSummaryCard } from "../../../components/ai-elements/transaction-summary";
import {
  ChartCard,
  MultiCurrencyChartCard,
  TransactionStatusDoughnutCard,
  type TransactionStatusDoughnutConfig,
  type ChartInputConfig,
  type MultiCurrencyAreaChartConfig,
  type PreliminaryMultiCurrencyAreaChartConfig,
} from "../../../components/ai-elements/chart";
import { normalizeTransactionsFromOutput } from "~/lib/transactions";
import { cn } from "~/lib/utils";
import { useEffectiveAssistantPageContext } from "~/components/assistant/page-assistant-context";
import type { AssistantPageContext } from "~/lib/assistant-context";
import { InputGroupAddon } from "~/components/ui/input-group";

const models = [
  {
    name: "Gemini 2.5 Flash",
    value: "gemini-2.5-flash",
  },
  {
    name: "GPT 5 Mini",
    value: "gpt-5-mini",
  },
  {
    name: "Gemini 2.5 Pro",
    value: "gemini-2.5-pro",
  },
];

export const chatModels = models;

const loadingMessages = [
  "Doodling...",
  "Germinating...",
  "Pondering...",
  "Dream-weaving...",
  "Percolating ideas...",
  "Conspiring with the muses...",
] as const;

export type ChatPanelVariant = "standalone" | "dock";

export type ChatPanelProps = {
  className?: string;
  initialModel?: string;
  initialWebSearch?: boolean;
  suggestions?: string[];
  variant?: ChatPanelVariant;
  pageContext?: AssistantPageContext;
};

export type ClassificationUIMessage = UIMessage<
  never,
  {
    refusal: {
      text: string;
    };
    clarification: {
      text: string;
    };
  }
>;

const defaultSuggestions = [
  "Show revenue trends for the past 30 days",
  "Compare volume and count for last month",
  "What was the busiest day of the week last month?",
];

const AssistantAvatar = () => (
  <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
    <svg
      aria-hidden="true"
      height="14"
      width="14"
      viewBox="0 0 16 16"
      style={{ color: "currentColor" }}
    >
      <path
        d="M2.5 0.5V0H3.5V0.5C3.5 1.60457 4.39543 2.5 5.5 2.5H6V3V3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V6H3H2.5V5.5C2.5 4.39543 1.60457 3.5 0.5 3.5H0V3V2.5H0.5C1.60457 2.5 2.5 1.60457 2.5 0.5Z"
        fill="currentColor"
      />
      <path
        d="M14.5 4.5V5H13.5V4.5C13.5 3.94772 13.0523 3.5 12.5 3.5H12V3V2.5H12.5C13.0523 2.5 13.5 2.05228 13.5 1.5V1H14H14.5V1.5C14.5 2.05228 14.9477 2.5 15.5 2.5H16V3V3.5H15.5C14.9477 3.5 14.5 3.94772 14.5 4.5Z"
        fill="currentColor"
      />
      <path
        d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z"
        fill="currentColor"
      />
    </svg>
  </div>
);

export function ChatPanel({
  className,
  initialModel = models[0].value,
  initialWebSearch = false,
  suggestions = defaultSuggestions,
  variant = "standalone",
  pageContext,
}: ChatPanelProps) {
  const chatId = "123e4567-e89b-12d3-a456-426614174091";
  const { messages, sendMessage, status, regenerate, error } =
    useChat<ClassificationUIMessage>({
      transport: new DefaultChatTransport({
        api: "http://localhost:3000/chat/stream",
        prepareSendMessagesRequest(request) {
          return {
            body: {
              conversationId: chatId,
              message: request.messages.at(-1),
              mode: "global",
              // ...request.body,
            },
            headers: {
              Authorization:
                "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MTMyNiwibWZhIjpmYWxzZSwibWZhVHlwZSI6bnVsbCwic3NvTG9naW4iOmZhbHNlLCJqdGkiOiI2OTQ1MjJkYWI0MDQ3NDkxNDEzNWZiZWUiLCJpYXQiOjE3NjYxMzg1ODYsIm5iZiI6MTc2NjEzODU4NiwiZXhwIjoxNzY2MjI0OTg2fQ.5r7-MydS9zytgQv-Er4ZUx02fzCtYPtD8d1IBS7prMU",
            },
          };
        },
      }),
    });
  const [input, setInput] = useState("");
  const [model, setModel] = useState(initialModel);
  const [webSearch, setWebSearch] = useState(initialWebSearch);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [feedbackByMessage, setFeedbackByMessage] = useState<
    Record<string, "up" | "down">
  >({});
  const [pendingFeedback, setPendingFeedback] = useState<
    Record<string, boolean>
  >({});

  const contextForRequest = useEffectiveAssistantPageContext(pageContext);

  const buildRequestBody = useCallback(() => {
    return {
      model,
      webSearch,
      ...(contextForRequest ? { pageContext: contextForRequest } : {}),
    } satisfies Record<string, unknown>;
  }, [contextForRequest, model, webSearch]);

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(
      {
        text: suggestion,
      },
      {
        body: buildRequestBody(),
      }
    );
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    // window.history.replaceState({}, "", `/chat/${chatId}`);

    if (!(hasText || hasAttachments)) {
      return;
    }
    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: buildRequestBody(),
      }
    );
    setInput("");
  };

  const handleRegenerate = () => {
    void regenerate({
      body: buildRequestBody(),
    });
  };

  const submitHelpfulness = useCallback(
    async (
      messageId: string,
      traceId: string | undefined,
      rating: "up" | "down",
      responseText: string
    ) => {
      if (!traceId) {
        console.warn("No trace ID available for helpfulness feedback.");
        return;
      }

      setPendingFeedback((prev) => ({ ...prev, [messageId]: true }));

      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            traceId,
            messageId,
            rating,
            responseText,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to submit feedback");
        }

        setFeedbackByMessage((prev) => ({ ...prev, [messageId]: rating }));
      } catch (feedbackError) {
        console.error("Unable to submit helpfulness score", feedbackError);
      } finally {
        setPendingFeedback((prev) => ({ ...prev, [messageId]: false }));
      }
    },
    []
  );

  const latestAssistantMessage = messages
    .slice()
    .reverse()
    .find((message) => message.role === "assistant");

  const assistantHasRenderableContent = Boolean(
    latestAssistantMessage?.parts.some(
      (part) =>
        part.type === "text" ||
        (part.type === "reasoning" && Boolean(part.text)) ||
        part.type === "tool-getTransactions" ||
        part.type === "tool-analyzeAndVisualizeTransactions" ||
        part.type === "tool-compareTransactionMetrics"
    )
  );

  const isAwaitingAssistantContent =
    status === "streaming" && !assistantHasRenderableContent;
  const showLoader = status === "submitted" || isAwaitingAssistantContent;

  useEffect(() => {
    if (!showLoader) {
      return;
    }

    // Kick once so each loading session starts with a fresh thought.
    setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);

    const intervalId = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 3500);

    return () => clearInterval(intervalId);
  }, [showLoader]);

  const containerClasses = cn(
    "relative size-full",
    variant === "standalone"
      ? "max-w-4xl mx-auto p-6 h-screen"
      : "flex flex-col p-4",
    className
  );

  const isDock = variant === "dock";
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className={containerClasses}>
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === "assistant" &&
                  message.parts.filter((part) => part.type === "source-url")
                    .length > 0 && (
                    <Sources>
                      <SourcesTrigger
                        count={
                          message.parts.filter(
                            (part) => part.type === "source-url"
                          ).length
                        }
                      />
                      {message.parts
                        .filter((part) => part.type === "source-url")
                        .map((part, i) => (
                          <SourcesContent key={`${message.id}-${i}`}>
                            <Source
                              key={`${message.id}-${i}`}
                              href={part.url}
                              title={part.url}
                            />
                          </SourcesContent>
                        ))}
                    </Sources>
                  )}
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text": {
                      const isLatestAssistant =
                        message.role === "assistant" &&
                        message.id === messages.at(-1)?.id &&
                        i === message.parts.length - 1;
                      const shouldShowAssistantAvatar =
                        message.role === "assistant";
                      const metadata = message.metadata as
                        | { traceId?: string }
                        | undefined;
                      const traceId = metadata?.traceId;
                      const currentFeedback = feedbackByMessage[message.id];
                      const isSubmitting = pendingFeedback[message.id] ?? false;
                      const handleFeedback = (rating: "up" | "down") =>
                        submitHelpfulness(
                          message.id,
                          traceId,
                          rating,
                          part.text
                        );

                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message
                            from={message.role}
                            className={cn(isDock && "max-w-[90%]")}
                          >
                            {shouldShowAssistantAvatar && <AssistantAvatar />}
                            <MessageContent>
                              <MessageResponse>{part.text}</MessageResponse>
                              {isLatestAssistant && (
                                <MessageActions className="mt-2">
                                  <MessageAction
                                    onClick={handleRegenerate}
                                    label="Retry"
                                  >
                                    <RefreshCcwIcon className="size-3" />
                                  </MessageAction>
                                  <MessageAction
                                    onClick={() =>
                                      navigator.clipboard.writeText(part.text)
                                    }
                                    label="Copy"
                                  >
                                    <CopyIcon className="size-3" />
                                  </MessageAction>
                                  <MessageAction
                                    aria-pressed={currentFeedback === "up"}
                                    disabled={isSubmitting}
                                    onClick={() => handleFeedback("up")}
                                    label={
                                      currentFeedback === "up"
                                        ? "Marked helpful"
                                        : "Thumbs Up"
                                    }
                                    variant={
                                      currentFeedback === "up"
                                        ? "default"
                                        : "ghost"
                                    }
                                  >
                                    <ThumbsUpIcon className="size-3" />
                                  </MessageAction>
                                  <MessageAction
                                    aria-pressed={currentFeedback === "down"}
                                    disabled={isSubmitting}
                                    onClick={() => handleFeedback("down")}
                                    label={
                                      currentFeedback === "down"
                                        ? "Marked not helpful"
                                        : "Thumbs Down"
                                    }
                                    variant={
                                      currentFeedback === "down"
                                        ? "destructive"
                                        : "ghost"
                                    }
                                  >
                                    <ThumbsDownIcon className="size-3" />
                                  </MessageAction>
                                </MessageActions>
                              )}
                            </MessageContent>
                          </Message>
                        </Fragment>
                      );
                    }

                    // case "text": {
                    //   const data = {
                    //     success: true,
                    //     label: "Daily Transaction Metrics",
                    //     chartType: "area",
                    //     chartSeries: [
                    //       {
                    //         currency: "NGN",
                    //         points: [
                    //           {
                    //             name: "Sunday, Dec 1",
                    //             count: 40,
                    //             volume: 1680000,
                    //             average: 42000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Monday, Dec 2",
                    //             count: 65,
                    //             volume: 2470000,
                    //             average: 38000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Tuesday, Dec 3",
                    //             count: 80,
                    //             volume: 3600000,
                    //             average: 45000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Wednesday, Dec 4",
                    //             count: 55,
                    //             volume: 2200000,
                    //             average: 40000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Thursday, Dec 5",
                    //             count: 95,
                    //             volume: 4465000,
                    //             average: 47000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Friday, Dec 6",
                    //             count: 120,
                    //             volume: 6240000,
                    //             average: 52000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Saturday, Dec 7",
                    //             count: 70,
                    //             volume: 2870000,
                    //             average: 41000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Sunday, Dec 8",
                    //             count: 60,
                    //             volume: 2340000,
                    //             average: 39000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Monday, Dec 9",
                    //             count: 85,
                    //             volume: 4080000,
                    //             average: 48000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Tuesday, Dec 10",
                    //             count: 100,
                    //             volume: 5000000,
                    //             average: 50000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Wednesday, Dec 11",
                    //             count: 75,
                    //             volume: 3225000,
                    //             average: 43000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Thursday, Dec 12",
                    //             count: 50,
                    //             volume: 1800000,
                    //             average: 36000,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Friday, Dec 13",
                    //             count: 90,
                    //             volume: 4095000,
                    //             average: 45500,
                    //             currency: "NGN",
                    //           },
                    //           {
                    //             name: "Saturday, Dec 14",
                    //             count: 110,
                    //             volume: 5610000,
                    //             average: 51000,
                    //             currency: "NGN",
                    //           },
                    //         ],
                    //       },
                    //       {
                    //         currency: "USD",
                    //         points: [
                    //           {
                    //             name: "Sunday, Dec 1",
                    //             count: 10,
                    //             volume: 950000,
                    //             average: 95000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Monday, Dec 2",
                    //             count: 15,
                    //             volume: 1350000,
                    //             average: 90000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Tuesday, Dec 3",
                    //             count: 18,
                    //             volume: 1980000,
                    //             average: 110000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Wednesday, Dec 4",
                    //             count: 12,
                    //             volume: 1200000,
                    //             average: 100000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Thursday, Dec 5",
                    //             count: 20,
                    //             volume: 2100000,
                    //             average: 105000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Friday, Dec 6",
                    //             count: 25,
                    //             volume: 2875000,
                    //             average: 115000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Saturday, Dec 7",
                    //             count: 16,
                    //             volume: 1568000,
                    //             average: 98000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Sunday, Dec 8",
                    //             count: 14,
                    //             volume: 1428000,
                    //             average: 102000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Monday, Dec 9",
                    //             count: 19,
                    //             volume: 2052000,
                    //             average: 108000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Tuesday, Dec 10",
                    //             count: 22,
                    //             volume: 2464000,
                    //             average: 112000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Wednesday, Dec 11",
                    //             count: 17,
                    //             volume: 1683000,
                    //             average: 99000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Thursday, Dec 12",
                    //             count: 11,
                    //             volume: 1023000,
                    //             average: 93000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Friday, Dec 13",
                    //             count: 21,
                    //             volume: 2247000,
                    //             average: 107000,
                    //             currency: "USD",
                    //           },
                    //           {
                    //             name: "Saturday, Dec 14",
                    //             count: 24,
                    //             volume: 2736000,
                    //             average: 114000,
                    //             currency: "USD",
                    //           },
                    //         ],
                    //       },
                    //     ],
                    //     summary: {
                    //       totalCount: 1339,
                    //       totalVolume: null,
                    //       overallAverage: null,
                    //       perCurrency: [
                    //         {
                    //           currency: "NGN",
                    //           totalCount: 1095,
                    //           totalVolume: 49675000,
                    //           overallAverage: 45358,
                    //         },
                    //         {
                    //           currency: "USD",
                    //           totalCount: 244,
                    //           totalVolume: 25656000,
                    //           overallAverage: 105131.15,
                    //         },
                    //       ],
                    //       dateRange: {
                    //         from: "Dec 1, 2024",
                    //         to: "Dec 14, 2024",
                    //       },
                    //     },
                    //     message:
                    //       "Static mock data for overlapping area chart (count, volume, average)",
                    //   };

                    //   return (
                    //     <div key={`${message.id}-${i}`}>
                    //       <MultiCurrencyChartCard
                    //         config={data as MultiCurrencyAreaChartConfig}
                    //         defaultMetric="count"
                    //       />
                    //     </div>
                    //   );
                    // }

                    // case "text": {
                    //   const data = {
                    //     success: true,
                    //     label: "Transaction Metrics by Status",
                    //     chartType: "doughnut",
                    //     chartData: [
                    //       {
                    //         name: "success",
                    //         count: 620,
                    //         volume: 28500000,
                    //         average: 45968,
                    //         currency: "NGN",
                    //       },
                    //       {
                    //         name: "failed",
                    //         count: 120,
                    //         volume: 1800000,
                    //         average: 15000,
                    //         currency: "NGN",
                    //       },
                    //       {
                    //         name: "pending",
                    //         count: 60,
                    //         volume: 2700000,
                    //         average: 45000,
                    //         currency: "NGN",
                    //       },
                    //       {
                    //         name: "success",
                    //         count: 140,
                    //         volume: 12600000,
                    //         average: 90000,
                    //         currency: "USD",
                    //       },
                    //       {
                    //         name: "failed",
                    //         count: 35,
                    //         volume: 210000,
                    //         average: 6000,
                    //         currency: "USD",
                    //       },
                    //       {
                    //         name: "pending",
                    //         count: 25,
                    //         volume: 2125000,
                    //         average: 85000,
                    //         currency: "USD",
                    //       },
                    //     ],
                    //     summary: {
                    //       totalCount: 1000,
                    //       totalVolume: null,
                    //       overallAverage: null,
                    //       perCurrency: [
                    //         {
                    //           currency: "NGN",
                    //           totalCount: 800,
                    //           totalVolume: 33000000,
                    //           overallAverage: 41250,
                    //         },
                    //         {
                    //           currency: "USD",
                    //           totalCount: 200,
                    //           totalVolume: 14925000,
                    //           overallAverage: 74625,
                    //         },
                    //       ],
                    //     },
                    //     message:
                    //       "Static mock data for transaction status doughnut chart",
                    //   };

                    //   return (
                    //     <TransactionStatusDoughnutCard
                    //       config={data as TransactionStatusDoughnutConfig}
                    //       defaultMetric="count"
                    //     />
                    //   );
                    // }

                    case "data-refusal": {
                      return (
                        <div key={`${message.id}-${i}`}>
                          <p>{part.data.text}</p>
                        </div>
                      );
                    }

                    case "reasoning":
                      return (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className="w-full"
                          isStreaming={
                            status === "streaming" &&
                            i === message.parts.length - 1 &&
                            message.id === messages.at(-1)?.id
                          }
                        >
                          {part.text && (
                            <>
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </>
                          )}
                        </Reasoning>
                      );

                    case "tool-getTransactions": {
                      // Hide the transaction summary if a chart is being generated
                      // (the chart provides the visualization the user asked for)
                      const hasChartInMessage = message.parts.some(
                        (p) => p.type === "tool-generateChart"
                      );
                      if (hasChartInMessage) {
                        return null;
                      }

                      if (part.errorText) {
                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
                          >
                            {part.errorText}
                          </div>
                        );
                      }

                      const isFinalOutput =
                        part.state === "output-available" && !part.preliminary;
                      const transactionData = isFinalOutput
                        ? normalizeTransactionsFromOutput(part.output)
                        : { transactions: [], meta: {} };
                      const isLoading =
                        part.state !== "output-available" ||
                        Boolean(part.preliminary);

                      return (
                        <TransactionSummaryCard
                          key={`${message.id}-${i}`}
                          transactions={transactionData.transactions}
                          meta={transactionData.meta}
                          isLoading={isLoading}
                        />
                      );
                    }

                    case "tool-generateChartData": {
                      // const data = {
                      //   success: true,
                      //   label:
                      //     "Daily Transaction Metrics (Dec 1, 2024 - Dec 14, 2024)",
                      //   chartType: "area",
                      //   chartSeries: [
                      //     {
                      //       currency: "NGN",
                      //       points: [
                      //         {
                      //           name: "Sunday, Dec 1",
                      //           count: 40,
                      //           volume: 1680000,
                      //           average: 42000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Monday, Dec 2",
                      //           count: 65,
                      //           volume: 2470000,
                      //           average: 38000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Tuesday, Dec 3",
                      //           count: 80,
                      //           volume: 3600000,
                      //           average: 45000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Wednesday, Dec 4",
                      //           count: 55,
                      //           volume: 2200000,
                      //           average: 40000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Thursday, Dec 5",
                      //           count: 95,
                      //           volume: 4465000,
                      //           average: 47000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Friday, Dec 6",
                      //           count: 120,
                      //           volume: 6240000,
                      //           average: 52000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Saturday, Dec 7",
                      //           count: 70,
                      //           volume: 2870000,
                      //           average: 41000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Sunday, Dec 8",
                      //           count: 60,
                      //           volume: 2340000,
                      //           average: 39000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Monday, Dec 9",
                      //           count: 85,
                      //           volume: 4080000,
                      //           average: 48000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Tuesday, Dec 10",
                      //           count: 100,
                      //           volume: 5000000,
                      //           average: 50000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Wednesday, Dec 11",
                      //           count: 75,
                      //           volume: 3225000,
                      //           average: 43000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Thursday, Dec 12",
                      //           count: 50,
                      //           volume: 1800000,
                      //           average: 36000,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Friday, Dec 13",
                      //           count: 90,
                      //           volume: 4095000,
                      //           average: 45500,
                      //           currency: "NGN",
                      //         },
                      //         {
                      //           name: "Saturday, Dec 14",
                      //           count: 110,
                      //           volume: 5610000,
                      //           average: 51000,
                      //           currency: "NGN",
                      //         },
                      //       ],
                      //     },
                      //     {
                      //       currency: "USD",
                      //       points: [
                      //         {
                      //           name: "Sunday, Dec 1",
                      //           count: 10,
                      //           volume: 950000,
                      //           average: 95000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Monday, Dec 2",
                      //           count: 15,
                      //           volume: 1350000,
                      //           average: 90000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Tuesday, Dec 3",
                      //           count: 18,
                      //           volume: 1980000,
                      //           average: 110000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Wednesday, Dec 4",
                      //           count: 12,
                      //           volume: 1200000,
                      //           average: 100000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Thursday, Dec 5",
                      //           count: 20,
                      //           volume: 2100000,
                      //           average: 105000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Friday, Dec 6",
                      //           count: 25,
                      //           volume: 2875000,
                      //           average: 115000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Saturday, Dec 7",
                      //           count: 16,
                      //           volume: 1568000,
                      //           average: 98000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Sunday, Dec 8",
                      //           count: 14,
                      //           volume: 1428000,
                      //           average: 102000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Monday, Dec 9",
                      //           count: 19,
                      //           volume: 2052000,
                      //           average: 108000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Tuesday, Dec 10",
                      //           count: 22,
                      //           volume: 2464000,
                      //           average: 112000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Wednesday, Dec 11",
                      //           count: 17,
                      //           volume: 1683000,
                      //           average: 99000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Thursday, Dec 12",
                      //           count: 11,
                      //           volume: 1023000,
                      //           average: 93000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Friday, Dec 13",
                      //           count: 21,
                      //           volume: 2247000,
                      //           average: 107000,
                      //           currency: "USD",
                      //         },
                      //         {
                      //           name: "Saturday, Dec 14",
                      //           count: 24,
                      //           volume: 2736000,
                      //           average: 114000,
                      //           currency: "USD",
                      //         },
                      //       ],
                      //     },
                      //   ],
                      //   summary: {
                      //     totalCount: 1339,
                      //     totalVolume: null,
                      //     overallAverage: null,
                      //     perCurrency: [
                      //       {
                      //         currency: "NGN",
                      //         totalCount: 1095,
                      //         totalVolume: 49675000,
                      //         overallAverage: 45358,
                      //       },
                      //       {
                      //         currency: "USD",
                      //         totalCount: 244,
                      //         totalVolume: 25656000,
                      //         overallAverage: 105131.15,
                      //       },
                      //     ],
                      //     dateRange: {
                      //       from: "Dec 1, 2024",
                      //       to: "Dec 14, 2024",
                      //     },
                      //   },
                      //   message:
                      //     "Static mock data for overlapping area chart (count, volume, average)",
                      // };

                      const isFinalOutput =
                        part.state === "output-available" &&
                        !(
                          part.output as PreliminaryMultiCurrencyAreaChartConfig
                        ).loading;
                      const chartData = isFinalOutput
                        ? part.output
                        : {
                            chartSeries: [],
                            chartData: [],
                            summary: {},
                            loading: true,
                            message: "Loading...",
                          };
                      const isLoading = part.state !== "output-available";
                      const isDonutChart = chartData.chartType === "doughnut";

                      return (
                        <div key={`${message.id}-${i}`}>
                          {isDonutChart ? (
                            <TransactionStatusDoughnutCard
                              config={
                                chartData as TransactionStatusDoughnutConfig
                              }
                              defaultMetric="count"
                              isLoading={isLoading}
                            />
                          ) : (
                            <MultiCurrencyChartCard
                              config={chartData as MultiCurrencyAreaChartConfig}
                              defaultMetric="count"
                              isLoading={isLoading}
                            />
                          )}
                        </div>
                      );
                    }

                    case "tool-analyzeAndVisualizeTransactions": {
                      if (part.errorText) {
                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
                          >
                            {part.errorText}
                          </div>
                        );
                      }

                      // The chart config comes from the tool's output
                      const output = part.output as
                        | { chartConfig?: ChartInputConfig; success?: boolean }
                        | undefined;
                      const chartConfig = output?.chartConfig;

                      const isChartLoading =
                        !chartConfig ||
                        part.state !== "output-available" ||
                        Boolean(part.preliminary);

                      // Show skeleton immediately even if config isn't available yet
                      const fallbackConfig: ChartInputConfig = {
                        chartType: "bar",
                        title: "Loading...",
                        labels: [],
                        datasets: [],
                      };

                      return (
                        <div style={{ width: "100%", height: "100%" }}>
                          <ChartCard
                            key={`${message.id}-${i}`}
                            config={chartConfig || fallbackConfig}
                            isLoading={isChartLoading}
                          />
                        </div>
                      );
                    }

                    case "tool-compareTransactionMetrics": {
                      if (part.errorText) {
                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
                          >
                            {part.errorText}
                          </div>
                        );
                      }

                      // The chart config comes from the tool's output
                      const output = part.output as
                        | { chartConfig?: ChartInputConfig; success?: boolean }
                        | undefined;
                      const chartConfig = output?.chartConfig;

                      const isChartLoading =
                        !chartConfig ||
                        part.state !== "output-available" ||
                        Boolean(part.preliminary);

                      // Show skeleton immediately even if config isn't available yet
                      const fallbackConfig: ChartInputConfig = {
                        chartType: "line",
                        title: "Loading metric comparison...",
                        labels: [],
                        datasets: [],
                      };

                      return (
                        <div style={{ width: "100%", height: "100%" }}>
                          <ChartCard
                            key={`${message.id}-${i}`}
                            config={chartConfig || fallbackConfig}
                            isLoading={isChartLoading}
                          />
                        </div>
                      );
                    }

                    default:
                      return null;
                  }
                })}
              </div>
            ))}
            {showLoader && (
              <div aria-live="polite" className="px-4 pb-4" role="status">
                <div className="flex max-w-[80%] items-start gap-3 text-left">
                  <AssistantAvatar />
                  <Shimmer duration={1} className="text-sm">
                    {loadingMessages[loadingMessageIndex]}
                  </Shimmer>
                </div>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className={cn("w-full", isDock ? "p-0" : "px-4 pb-4")}>
          {messages.length === 0 && suggestions.length > 0 && !isDock && (
            <Suggestions className="px-4">
              {suggestions.map((suggestion) => (
                <Suggestion
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  suggestion={suggestion}
                />
              ))}
            </Suggestions>
          )}
          {isDock ? (
            <PromptInput
              onSubmit={handleSubmit}
              className="mt-4"
              inputType="input"
            >
              <PromptInputInput
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setInput(e.target.value)
                }
                value={input}
              />
              <InputGroupAddon align="inline-end">
                <PromptInputSubmit
                  disabled={!input && !status}
                  status={status}
                  className="flex items-center justify-center rounded-full"
                />
              </InputGroupAddon>
            </PromptInput>
          ) : (
            <PromptInput
              onSubmit={handleSubmit}
              className="mt-4"
              globalDrop
              multiple
            >
              <PromptInputHeader>
                <PromptInputAttachments>
                  {(attachment: FileUIPart & { id: string }) => (
                    <PromptInputAttachment data={attachment} />
                  )}
                </PromptInputAttachments>
              </PromptInputHeader>
              <PromptInputBody>
                <PromptInputTextarea
                  ref={textareaRef}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setInput(e.target.value)
                  }
                  value={input}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                  <PromptInputSpeechButton
                    aria-label="Dictate message"
                    title="Dictate message"
                    textareaRef={textareaRef}
                    onTranscriptionChange={(text) => setInput(text)}
                  />
                  <PromptInputButton
                    variant={webSearch ? "default" : "ghost"}
                    onClick={() => setWebSearch(!webSearch)}
                    type="button"
                  >
                    <GlobeIcon size={16} />
                    <span>Search</span>
                  </PromptInputButton>
                  <PromptInputSelect
                    onValueChange={(value: string) => {
                      setModel(value);
                    }}
                    value={model}
                  >
                    <PromptInputSelectTrigger>
                      <PromptInputSelectValue />
                    </PromptInputSelectTrigger>
                    <PromptInputSelectContent>
                      {models.map((chatModel) => (
                        <PromptInputSelectItem
                          key={chatModel.value}
                          value={chatModel.value}
                        >
                          {chatModel.name}
                        </PromptInputSelectItem>
                      ))}
                    </PromptInputSelectContent>
                  </PromptInputSelect>
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={!input && !status}
                  status={status}
                />
              </PromptInputFooter>
            </PromptInput>
          )}
          {error && (
            <div className="px-4 text-sm text-destructive">
              Something went wrong. Please try again.
              {JSON.stringify(error, null, 2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
