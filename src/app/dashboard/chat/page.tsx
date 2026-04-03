"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/components/ui/Animations";
import { Send, User, CheckCheck, Loader2 } from "lucide-react";

// Mock initial messages
const mockMessages = [
  { id: 1, text: "Hey guys, is machine 2 working now?", sender: "Rahul", isMe: false, time: "10:30 AM" },
  { id: 2, text: "Yeah I just finished using it, works fine.", sender: "You", isMe: true, time: "10:35 AM" },
  { id: 3, text: "Awesome, heading down.", sender: "Rahul", isMe: false, time: "10:36 AM" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsSending(true);
    // Simulate network delay
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { id: Date.now(), text: input, sender: "You", isMe: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      setInput("");
      setIsSending(false);
    }, 400);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Community Chat</h1>
        <p className="text-white/50">Coordinate with everyone at Sunny Meadows PG.</p>
      </div>

      <motion.div 
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex-1 bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden relative"
      >
        {/* Abstract Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 z-10 flex flex-col">
          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1;
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
                  msg.isMe ? "bg-cyan-500 text-black hidden md:flex" : "bg-white/10 text-white"
                }`}>
                  {msg.isMe ? "U" : msg.sender.charAt(0)}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
                  {!msg.isMe && <span className="text-xs text-white/40 mb-1 ml-1">{msg.sender}</span>}
                  <div className={`px-4 py-3 rounded-2xl ${
                    msg.isMe 
                      ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-tr-sm shadow-[0_4px_15px_rgba(0,212,255,0.2)]" 
                      : "bg-white/10 text-white/90 rounded-tl-sm backdrop-blur-md"
                  }`}>
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-white/40 mr-1">
                    {msg.time}
                    {msg.isMe && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={endRef} className="h-1 shrink-0" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-xl z-20">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Sunny Meadows PG..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="w-12 shrink-0 rounded-xl bg-cyan-500 text-black flex items-center justify-center hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 transition-colors"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
