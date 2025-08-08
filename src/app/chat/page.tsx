'use client';
import { useState, useRef, useEffect } from 'react';
import { logout } from '../logout/actions';
import { FaRobot, FaCopy, FaCheck, FaCode, FaHistory, FaPlus } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { createClient } from '@/utils/supabase/client';
import SplashCursor from '../../../components/SplashCursor';

const demoUser = { name: 'You' };
const botUser = { name: 'Bot' };

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type Message = {
  id: number;
  user: typeof demoUser | typeof botUser;
  text: string;
  time: string;
};

type ChatSession = {
  id: string;
  created_at: string;
  first_message: string;
};

const TypingIndicator = () => (
  <div className="flex items-end gap-3 justify-start animate-fade-in">
    <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-purple-700 shadow">
      <FaRobot className="h-6 w-6 text-white" />
    </span>
    <div className="relative px-5 py-3 rounded-2xl max-w-[70%] shadow-md bg-white/10 text-purple-100 border border-purple-500 rounded-bl-none">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  </div>
);

const CopyButton = ({ text, isCode = false }: { text: string; isCode?: boolean }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`${isCode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200 p-1 rounded text-purple-300 hover:text-purple-100`}
      title={isCode ? "Copy code" : "Copy message"}
    >
      {copied ? (
        <FaCheck className="h-3 w-3 text-green-400" />
      ) : (
        <FaCopy className="h-3 w-3" />
      )}
    </button>
  );
};

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  return (
    <div className="mt-3 bg-gray-900 rounded-lg border border-purple-500/30 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <FaCode className="h-3 w-3 text-purple-400" />
          <span className="text-xs font-medium text-purple-300 uppercase">{language}</span>
        </div>
        <CopyButton text={code} isCode={true} />
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const parseMessageWithCode = (text: string) => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }

    parts.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim()
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 120; // Maximum height in pixels (about 5 lines)
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  useEffect(() => {
    const loadChatSessions = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('id, created_at, first_message')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChatSessions(sessions || []);
    };

    loadChatSessions();
  }, []);

  const loadMessages = async (sessionId: string) => {
    const supabase = createClient();
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
  
      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Failed to load messages: ${error.message || 'Unknown error'}`);
      }
  
      if (messages?.length) {
        const formatted = messages.map((msg) => {
          if (!msg.id || !msg.text || !msg.created_at || typeof msg.is_bot !== 'boolean') {
            console.warn('Invalid message data skipped:', msg);
            return null;
          }
          return {
            id: msg.id,
            user: msg.is_bot ? botUser : demoUser,
            text: msg.text,
            time: formatTime(new Date(msg.created_at)),
          };
        }).filter((msg): msg is Message => msg !== null);
  
        setMessages(formatted);
      } else {
        setMessages([]);
        console.log(`No messages found for session ${sessionId}`);
      }
      setCurrentSessionId(sessionId);
    } catch (err) {
      console.error('Failed to load messages:', err instanceof Error ? err.message : err);
      setMessages([{ 
        id: Date.now(), 
        user: botUser, 
        text: "❌ Error loading chat history. Please try again or start a new chat.", 
        time: formatTime(new Date()) 
      }]);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMsg = payload.new;
        if (newMsg.session_id === currentSessionId) {
          setMessages((prev) => [
            ...prev,
            {
              id: newMsg.id,
              user: newMsg.is_bot ? botUser : demoUser,
              text: newMsg.text,
              time: formatTime(new Date(newMsg.created_at)),
            },
          ]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const startNewChat = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const newSessionId = Date.now().toString();
    const { error } = await supabase
      .from('chat_sessions')
      .insert({ id: newSessionId, user_id: session.user.id, first_message: 'New chat' });

    if (error) throw error;

    setMessages([{
      id: Date.now(),
      user: botUser,
      text: "👋 Hi! I'm Grok. How can I help you?",
      time: formatTime(new Date()),
    }]);
    setCurrentSessionId(newSessionId);
    setChatSessions((prev) => [{
      id: newSessionId,
      created_at: new Date().toISOString(),
      first_message: 'New chat'
    }, ...prev]);
    setIsHistoryOpen(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = Date.now().toString();
      await supabase
        .from('chat_sessions')
        .insert({ id: sessionId, user_id: session.user.id, first_message: input });
      setCurrentSessionId(sessionId);
      setChatSessions((prev) => [{
        id: sessionId || '',
        created_at: new Date().toISOString(),
        first_message: input
      }, ...prev]);
    }

    const msg = {
      id: Date.now(),
      user: demoUser,
      text: input,
      time: formatTime(new Date()),
    };
    setMessages((prev) => [...prev, msg]);
    setInput('');
    setIsTyping(true);

    await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        user_id: session.user.id,
        text: input,
        is_bot: false,
      });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg.text }),
      });
      const data = await res.json();
      setTimeout(async () => {
        setIsTyping(false);
        const botMsg = {
          id: Date.now() + 1,
          user: botUser,
          text: data.reply || "🤖 Sorry, no reply.",
          time: formatTime(new Date()),
        };
        setMessages((prev) => [...prev, botMsg]);
        await supabase
          .from('messages')
          .insert({
            session_id: sessionId,
            user_id: session.user.id,
            text: botMsg.text,
            is_bot: true,
          });
      }, 1000);
    } catch {
      setIsTyping(false);
      const errorMsg = {
        id: Date.now() + 1,
        user: botUser,
        text: "❌ Error fetching reply.",
        time: formatTime(new Date()),
      };
      setMessages((prev) => [...prev, errorMsg]);
      await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          user_id: session.user.id,
          text: errorMsg.text,
          is_bot: true,
        });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as React.FormEvent);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-tr from-black via-gray-900 to-black text-white relative">
      <SplashCursor/>

      {/* History Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/20 transform ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out z-60`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-purple-300">Chat History</h2>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="text-purple-300 hover:text-purple-100"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-100px)]">
            {chatSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  loadMessages(session.id);
                  setIsHistoryOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg hover:bg-purple-500/20 ${
                  currentSessionId === session.id ? 'bg-purple-500/30' : ''
                }`}
              >
                <p className="text-sm text-purple-200 truncate">{session.first_message}</p>
                <p className="text-xs text-purple-400">{formatDate(new Date(session.created_at))}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Glossy container */}
      <div className="max-w-3xl mx-auto flex flex-col min-h-screen z-0">
        
        {/* Navbar */}
        <header className="sticky top-0 z-60 bg-gradient-to-r from-purple-100 to-white text-gray-900 backdrop-blur-2xl shadow-md rounded-b-xl px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 rounded-full hover:bg-purple-200"
            >
              <FaHistory className="h-5 w-5 text-purple-600" />
            </button>
            <div className="h-10 w-10 bg-purple-500 rounded-full flex items-center justify-center shadow">
              <FaRobot className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Grok AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startNewChat}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-1.5 rounded-lg font-semibold shadow flex items-center gap-2"
            >
              <FaPlus className="h-4 w-4" />
              New Chat
            </button>
            <button
              onClick={async () => {
                const result = await Swal.fire({
                  title: 'Sign Out',
                  text: 'Do you want to log out?',
                  icon: 'question',
                  confirmButtonText: 'Yes',
                  cancelButtonText: 'Cancel',
                  showCancelButton: true,
                  background: '#fff',
                });
                if (result.isConfirmed) await logout();
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-1.5 rounded-lg font-semibold shadow"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Chat area */}
        <main className="flex-1 p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl mt-6 shadow-inner overflow-y-auto z-50">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.user.name === demoUser.name ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`rounded-2xl p-3 ${msg.user.name === demoUser.name ? 'max-w-sm bg-purple-600' : 'max-w-2xl bg-white/10 border border-purple-500'} text-sm shadow-md 
                  ${msg.user.name === demoUser.name
                    ? 'text-white rounded-br-none'
                    : 'text-purple-100 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {msg.user.name === botUser.name ? (
                        <div>
                          {parseMessageWithCode(msg.text).map((part, index) => (
                            <div key={index}>
                              {part.type === 'text' && part.content.trim() && (
                                <p className="whitespace-pre-wrap">{part.content}</p>
                              )}
                              {part.type === 'code' && (
                                <CodeBlock code={part.content} language={part.language || 'plaintext'} />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>
                    {msg.user.name === botUser.name && !parseMessageWithCode(msg.text).some(part => part.type === 'code') && (
                      <CopyButton text={msg.text} />
                    )}
                  </div>
                  <p className="text-xs mt-1 text-right opacity-70">{msg.time}</p>
                </div>
              </div>
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>
        </main>

        {/* Input bar */}
        <form
          onSubmit={handleSend}
          className="sticky bottom-0 z-50 bg-gradient-to-r from-purple-100 to-white backdrop-blur-xl border border-white/20 rounded-t-xl px-4 py-3 mt-4 shadow-md"
        >
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                className="w-full bg-black/50 text-white placeholder:text-purple-300 px-4 py-3 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-200 min-h-[48px] max-h-[120px] overflow-y-auto leading-relaxed"
                placeholder="Type your message... (Shift + Enter for new line)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isTyping}
                rows={1}
                style={{ 
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#8b5cf6 transparent'
                }}
              />
              {/* Custom scrollbar styles */}
              <style jsx>{`
                textarea::-webkit-scrollbar {
                  width: 6px;
                }
                textarea::-webkit-scrollbar-track {
                  background: transparent;
                }
                textarea::-webkit-scrollbar-thumb {
                  background: #8b5cf6;
                  border-radius: 3px;
                }
                textarea::-webkit-scrollbar-thumb:hover {
                  background: #7c3aed;
                }
              `}</style>
            </div>
            <button
              type="submit"
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 transition-all duration-200 flex-shrink-0 min-h-[48px] flex items-center justify-center"
              disabled={isTyping || !input.trim()}
            >
              {isTyping ? (
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              ) : (
                'Send'
              )}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-600 text-center">
            Press Enter to send • Shift + Enter for new line
          </div>
        </form>
      </div>
    </div>
  );
}