'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { logout } from '../logout/actions';
import { createClient } from '@/utils/supabase/client';

const demoUser = {
  name: 'You',
  avatar: '/logo.png',
};
const botUser = {
  name: 'Bot',
  avatar: '/Chatbot-amico.png',
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  interface Message {
  id: number;
  user: typeof demoUser | typeof botUser;
  text: string;
  time: string;
}
const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages from Supabase on mount
  useEffect(() => {
    const fetchMessages = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('chatbot')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(
          data.map((msg: { id: number; is_bot: boolean; text: string; created_at: string }) => ({
            id: msg.id,
            user: msg.is_bot ? botUser : demoUser,
            text: msg.text,
            time: formatTime(new Date(msg.created_at)),
          }))
        );
      } else {
        setMessages([
          {
            id: 1,
            user: botUser,
            text: "👋 Hi! I'm your AI assistant. How can I help you today?",
            time: formatTime(new Date()),
          },
        ]);
      }
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }
    if (!input.trim()) {
      setLoading(false);
      return;
    }
    // Add user message immediately
    const userMsg: Message = {
      id: Date.now(), // temporary unique id
      user: demoUser,
      text: input,
      time: formatTime(new Date()),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBotTyping(true);
    // Call API
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await res.json();
      // Append bot reply
      const botMsg: Message = {
        id: Date.now() + 1, // ensure unique id
        user: botUser,
        text: data.reply,
        time: formatTime(new Date()),
      };
      setMessages((prev) => [...prev, botMsg]);
      setBotTyping(false);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        {
          id: msgs.length + 1,
          user: botUser,
          text: "❌ Error: Could not get a reply from OpenAI.",
          time: formatTime(new Date()),
        },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#f1f1f7] via-[#e0e7ff] to-[#dbeafe]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-md">
        <div className="flex items-center gap-3">
          <Image src={botUser.avatar} alt="Bot" width={40} height={40} className="h-10 w-10 rounded-full border-2 border-purple-400" />
          <span className="text-xl font-bold text-purple-700">AI Chatbot</span>
        </div>
        <form action={logout}>
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition"
            type="submit"
          >
            Sign Out
          </button>
        </form>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-auto px-2 py-8">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex items-end gap-3 ${msg.user.name === demoUser.name ? 'justify-end' : 'justify-start'} animate-fade-in`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {msg.user.name !== demoUser.name && (
                <Image src={msg.user.avatar} alt={msg.user.name} width={40} height={40} className="h-10 w-10 rounded-full border-2 border-purple-200 shadow animate-avatar-pop" />
              )}
              <div
                className={`p-4 rounded-3xl shadow-xl max-w-[75%] glass-bubble relative transition-all duration-300 ${
                  msg.user.name === demoUser.name
                    ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-br-none'
                    : 'bg-white bg-opacity-70 text-purple-900 border border-purple-100 rounded-bl-none backdrop-blur-xl'
                }`}
              >
                <div className="text-base font-medium whitespace-pre-line">{msg.text}</div>
                <div className="text-xs text-gray-400 text-right mt-2">{msg.time}</div>
              </div>
              {msg.user.name === demoUser.name && (
                <Image src={msg.user.avatar} alt={msg.user.name} width={40} height={40} className="h-10 w-10 rounded-full border-2 border-pink-200 shadow animate-avatar-pop" />
              )}
            </div>
          ))}
          {/* Bot typing indicator and typewriter effect */}
          {botTyping && (
            <div className="flex items-end gap-3 justify-start animate-fade-in">
              <Image src={botUser.avatar} alt={botUser.name} width={40} height={40} className="h-10 w-10 rounded-full border-2 border-purple-200 shadow animate-avatar-pop" />
              <div className="p-4 rounded-3xl shadow-xl max-w-[75%] glass-bubble relative bg-white bg-opacity-70 text-purple-900 border border-purple-100 rounded-bl-none backdrop-blur-xl">
                <div className="text-base font-medium flex items-center gap-2">
                  <span className="inline-flex">
                    <span className="dot dot1"></span>
                    <span className="dot dot2"></span>
                    <span className="dot dot3"></span>
                  </span>
                  <span className="ml-2">Bot is typing…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef}></div>
        </div>
        {/* Chat area animation styles */}
        <style jsx>{`
          .glass-bubble {
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.14);
            backdrop-filter: blur(10px);
          }
          .dot {
            height: 9px;
            width: 9px;
            margin: 0 2px;
            background: #a78bfa;
            border-radius: 50%;
            display: inline-block;
            animation: dot-typing 1.2s infinite both;
          }
          .dot1 { animation-delay: 0s; }
          .dot2 { animation-delay: 0.2s; }
          .dot3 { animation-delay: 0.4s; }
          @keyframes dot-typing {
            0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1.2); }
          }
          .animate-fade-in {
            animation: fadeIn 0.6s cubic-bezier(.39,.58,.57,1) both;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(24px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-avatar-pop {
            animation: avatarPop 0.7s cubic-bezier(.17,.67,.83,.67) both;
          }
          @keyframes avatarPop {
            0% { transform: scale(0.7); opacity: 0; }
            70% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </main>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="bg-white px-4 py-3 flex items-center gap-3 shadow-inner"
        style={{ borderTop: '1px solid #e5e7eb' }}
      >
        <input
          type="text"
          className="flex-1 px-4 py-2 rounded-full border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition text-black bg-gray-50"
          placeholder="Type your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-5 py-2 rounded-full font-semibold shadow transition"
          disabled={loading || !input.trim()}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}