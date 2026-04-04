"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Session } from "@supabase/supabase-js";
import {
  CheckCheck,
  Loader2,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { fadeUp } from "@/components/ui/Animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/realtime";
import { useDashboardStore } from "@/stores/dashboard-store";

import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { chatSchema } from "@/forms/shared/chat.schema";

interface ChatMessage {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  content: string;
  isDeleted: boolean;
  createdAt: string;
}

export default function ChatPage() {
  const supabase = createSupabaseClient();
  const pgData = useDashboardStore((state) => state.pgData);
  const pgStatus = useDashboardStore((state) => state.status);
  const fetchPgData = useDashboardStore((state) => state.fetchPgData);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"connected" | "disconnected" | "polling">("disconnected");
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pgData && pgStatus === "idle") {
      void fetchPgData();
    }
  }, [fetchPgData, pgData, pgStatus]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const loadInitialMessages = async () => {
      try {
        const response = await fetch("/api/chat?limit=100", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error?.message ?? "Failed to load chat");
        }

        setMessages(payload.data.messages as ChatMessage[]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load chat";
        toast.error(message);
      } finally {
        setIsBootstrapping(false);
      }
    };

    void loadInitialMessages();

    const realtimeClient = createRealtimeClient({
      pollUrl: "/api/chat?limit=100",
      pollIntervalMs: 10000,
      onStatus: setSyncStatus,
      onMessage: (payload) => {
        if (isChatApiPayload(payload)) {
          setMessages(payload.data.messages);
        }
      },
    });

    realtimeClient.connect();

    return () => realtimeClient.disconnect();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const currentUserId = session?.user?.id ?? null;
  const isAdmin = pgData?.role === "pg_admin";
  const pgName = pgData?.name ?? "your PG";
  const syncLabel = useMemo(() => {
    if (syncStatus === "connected") return "Live";
    if (syncStatus === "polling") return "Syncing";
    return "Offline";
  }, [syncStatus]);

  const form = useForm({
    defaultValues: {
      message: "",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    validatorAdapter: zodValidator(),
    validators: {
      onChange: chatSchema,
    },
    onSubmit: async ({ value }) => {
      const content = value.message.trim();
      if (!content) return;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error?.message ?? "Failed to send message");
        }

        const nextMessage = payload.data as ChatMessage;
        setMessages((currentMessages) => [...currentMessages, nextMessage]);
        form.reset();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to send message";
        toast.error(message);
      }
    },
  });

  const handleDeleteMessage = async (messageId: string) => {
    setDeletingMessageId(messageId);

    try {
      const response = await fetch(
        `/api/chat?messageId=${encodeURIComponent(messageId)}`,
        {
          method: "DELETE",
        }
      );
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Failed to delete message");
      }

      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== messageId)
      );
      toast.success("Message deleted");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete message";
      toast.error(message);
    } finally {
      setDeletingMessageId(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] w-full max-w-5xl flex-col">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Community Chat
          </h1>
          <p className="mt-2 text-muted-foreground">
            Coordinate with everyone at {pgName}. Messages reset daily at
            midnight.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/45">
          <Users className="size-4 text-primary" />
          {syncLabel}
        </div>
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-secondary/50"
      >
        <div className="pointer-events-none absolute inset-x-12 top-12 h-48 rounded-full bg-primary/5 blur-[100px]" />

        <div className="z-10 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
          {isBootstrapping ? (
            <div className="flex h-full min-h-72 items-center justify-center">
              <Loader2 className="size-7 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
              <h2 className="text-xl font-semibold text-white">No messages yet</h2>
              <p className="mt-2 max-w-md text-sm text-white/55">
                Start the conversation. Everything sent today stays visible until
                midnight.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isMe = message.userId === currentUserId;
              const canDelete = isMe || isAdmin;

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] ${isMe ? "items-end" : "items-start"} flex flex-col`}
                  >
                    <div className="mb-1 flex items-center gap-2 px-1 text-xs text-white/45">
                      {!isMe && <span className="font-medium text-white/70">{message.userName}</span>}
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                    <div
                      className={`group rounded-2xl border px-4 py-3 text-sm leading-6 ${
                        isMe
                          ? "rounded-tr-sm border-primary/20 bg-gradient-to-br from-primary to-violet-600 text-primary-foreground"
                          : "rounded-tl-sm border-white/10 bg-black/15 text-white/85"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                      </div>

                      <div
                        className={`mt-3 flex items-center gap-2 text-[11px] ${
                          isMe ? "justify-end text-primary-foreground/75" : "text-white/35"
                        }`}
                      >
                        {isMe ? <CheckCheck className="size-3.5" /> : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => void handleDeleteMessage(message.id)}
                            disabled={deletingMessageId === message.id}
                          >
                            {deletingMessageId === message.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Trash2 className="size-3" />
                            )}
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} className="h-1 shrink-0" />
        </div>

        <div className="z-20 border-t border-border bg-background/80 p-4 backdrop-blur-xl">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              form.handleSubmit();
            }}
            className="flex gap-2"
          >
            <form.Field name="message">
              {(field) => (
                <Input
                  type="text"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder={`Message ${pgName}...`}
                  autoComplete="off"
                  className="h-12 flex-1 rounded-xl border-border bg-secondary"
                />
              )}
            </form.Field>

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!canSubmit || isSubmitting}
                  className="h-12 w-12 shrink-0 rounded-xl"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Send className="size-5" />
                  )}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isChatApiPayload(
  payload: unknown
): payload is { success: true; data: { messages: ChatMessage[] } } {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as {
    success?: unknown;
    data?: { messages?: unknown };
  };

  return (
    candidate.success === true &&
    !!candidate.data &&
    Array.isArray(candidate.data.messages)
  );
}
