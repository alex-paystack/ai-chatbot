import { ChatPanel } from "~/components/chat/chat-panel";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { XIcon } from "lucide-react";

type AssistantDockProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  className?: string;
};

export const AssistantDock = ({
  open,
  onClose,
  title = "AI Assistant",
  description = "Context-aware help for this page",
  className,
}: AssistantDockProps) => {
  if (!open) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 right-10 z-40 flex flex-col gap-3">
      <span className="pointer-events-none h-16 w-16 translate-x-4 translate-y-6 rounded-full bg-primary/20 blur-3xl" />
      <div
        className={cn(
          "pointer-events-auto w-full min-w-[400px] max-w-[440px] overflow-hidden rounded-3xl border bg-card/95 shadow-[0_25px_80px_rgba(15,23,42,0.35)]",
          className
        )}
      >
        <header className="flex items-center gap-3 border-b bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="currentColor"
            >
              <path d="M10 1.5c.5 0 .96.26 1.22.68l1.64 2.65 3.07.63a1.4 1.4 0 0 1 .74 2.33l-2.24 2.33.38 3.27a1.4 1.4 0 0 1-2 1.42L10 13.32l-2.81 1.49a1.4 1.4 0 0 1-2-1.42l.38-3.27-2.24-2.33a1.4 1.4 0 0 1 .74-2.33l3.07-.63 1.64-2.65A1.4 1.4 0 0 1 10 1.5Z" />
            </svg>
          </div>
          <div className="flex-1 text-sm">
            <p className="font-semibold leading-tight text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full border"
            aria-label="Close assistant panel"
            onClick={onClose}
          >
            <XIcon className="size-4" />
          </Button>
        </header>
        <div className="h-[520px] max-h-[70vh] overflow-hidden">
          <ChatPanel variant="dock" className="h-full" />
        </div>
      </div>
    </div>
  );
};
