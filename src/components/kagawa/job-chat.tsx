"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { useKagawa } from "@/lib/store";
import type { JobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHAT_STATUSES: JobStatus[] = [
  "accepted",
  "en_route",
  "in_progress",
  "awaiting_payment",
  "completed",
];

export function JobChat({
  jobId,
  status,
  myId,
}: {
  jobId: string;
  status: JobStatus;
  myId: string;
}) {
  const t = useT();
  const allMessages = useKagawa((s) => s.messages);
  const sendMessage = useKagawa((s) => s.sendMessage);
  const messages = allMessages
    .filter((m) => m.jobId === jobId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const [text, setText] = useState("");
  const [warn, setWarn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const open = CHAT_STATUSES.includes(status);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = sendMessage(jobId, text);
    if (!result.ok) return;
    setText("");
    setWarn(Boolean(result.flagged));
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <p className="font-display font-semibold">{t("chat.title")}</p>
        <p className="text-[11px] text-muted-foreground">{t("chat.subtitle")}</p>
      </div>

      {!open ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          {t("chat.locked")}
        </p>
      ) : (
        <>
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                {t("chat.empty")}
              </p>
            )}
            {messages.map((m) => {
              const mine = m.senderId === myId;
              return (
                <div
                  key={m.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground",
                      m.flagged && "ring-2 ring-amber-400"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    {m.flagged && (
                      <p
                        className={cn(
                          "mt-1 flex items-center gap-1 text-[10px]",
                          mine ? "text-primary-foreground/80" : "text-amber-800"
                        )}
                      >
                        <ShieldAlert className="h-3 w-3" />
                        {t("chat.flagged")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {warn && (
            <div className="mx-3 mb-2 flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>{t("chat.safetyWarn")}</p>
            </div>
          )}

          <form
            onSubmit={onSubmit}
            className="flex gap-2 border-t border-border p-3"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("chat.placeholder")}
              className="h-10 rounded-full"
              maxLength={500}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
              disabled={!text.trim()}
              aria-label={t("chat.send")}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
