"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/components/ui/Animations";
import { Send, User, CheckCheck, Loader2 } from "lucide-react";

import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { chatSchema } from "@/forms/shared/chat.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Mock initial messages
const mockMessages = [
  { id: "1", text: "Hey guys, is machine 2 working now?", sender: "Rahul", isMe: false, time: "10:30 AM" },
  { id: "2", text: "Yeah I just finished using it, works fine.", sender: "You", isMe: true, time: "10:35 AM" },
  { id: "3", text: "Awesome, heading down.", sender: "Rahul", isMe: false, time: "10:36 AM" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState(mockMessages);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      if (!value.message.trim()) return;
      
      const newMessage = { 
        id: crypto.randomUUID(), 
        text: value.message, 
        sender: "You", 
        isMe: true, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      };

      // Optimistic update
      setMessages(prev => [...prev, newMessage]);
      form.reset();

      // Simulate network sync
      await new Promise(r => setTimeout(r, 400));
    },
  });

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">Community Chat</h1>
        <p className="text-muted-foreground">Coordinate with everyone at Sunny Meadows PG.</p>
      </div>

      <motion.div 
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex-1 bg-secondary/50 border border-border rounded-2xl flex flex-col overflow-hidden relative"
      >
        {/* Abstract Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 z-10 flex flex-col">
          {messages.map((msg, i) => {
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className={`flex gap-3 max-w-[80%] ${msg.isMe ? "ml-auto flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                  msg.isMe ? "bg-primary text-primary-foreground hidden md:flex" : "bg-muted text-muted-foreground"
                }`}>
                  {msg.isMe ? "U" : msg.sender.charAt(0)}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
                  {!msg.isMe && <span className="text-xs text-muted-foreground mb-1 ml-1">{msg.sender}</span>}
                  <div className={`px-4 py-3 rounded-2xl ${
                    msg.isMe 
                      ? "bg-gradient-to-br from-primary to-violet-600 text-primary-foreground rounded-tr-sm shadow-[0_4px_15px_rgba(var(--primary),0.2)]" 
                      : "bg-secondary text-secondary-foreground rounded-tl-sm backdrop-blur-md border border-border"
                  }`}>
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground mr-1">
                    {msg.time}
                    {msg.isMe && <CheckCheck className="w-3 h-3 text-primary" />}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={endRef} className="h-1 shrink-0" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background/80 border-t border-border backdrop-blur-xl z-20">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
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
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Message Sunny Meadows PG..."
                  autoComplete="off"
                  className="flex-1 bg-secondary border-border rounded-xl h-12"
                />
              )}
            </form.Field>
            
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!canSubmit || isSubmitting}
                  className="w-12 h-12 shrink-0 rounded-xl"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
