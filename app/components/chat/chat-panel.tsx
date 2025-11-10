import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useChat } from "@ai-sdk/react";
import type { FileUIPart } from "ai";
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
import { normalizeTransactionsFromOutput } from "~/lib/transactions";
import { cn } from "~/lib/utils";
import { useEffectiveAssistantPageContext } from "~/components/assistant/page-assistant-context";
import type { AssistantPageContext } from "~/lib/assistant-context";
import { InputGroupAddon } from "~/components/ui/input-group";

const models = [
  {
    name: "GPT 5 Mini",
    value: "gpt-5-mini",
  },
  {
    name: "Gemini 2.5 Flash",
    value: "gemini-2.5-flash",
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

const defaultSuggestions = ["Analyse my transactions for the last 30 days"];

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
  const { messages, sendMessage, status, regenerate, error } = useChat();
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
        part.type === "tool-getTransactions"
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
                      if (part.errorText) {
                        return (
                          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
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
                          transactions={transactionData.transactions}
                          meta={transactionData.meta}
                          isLoading={isLoading}
                        />
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
