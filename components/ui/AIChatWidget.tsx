'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, ChevronDown, ArrowLeft, Square } from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/auth/AuthContext';

const SUGGESTIONS = [
  'Có phòng nào dưới 4 triệu ở Cầu Giấy không?',
  'Phòng nào cho nuôi thú cưng (mèo/chó)?',
  'Phòng trống có điều hòa và ban công?',
  'Cách đặt lịch xem phòng như thế nào?',
];

export function AIChatWidget({ role = 'tenant' }: { role?: 'manager' | 'tenant' }) {
  const [isOpen, setIsOpen] = useState(false);
  const { company } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Touch Drag-to-Close Tracking
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);

  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: '/api/chat',
    body: {
      data: {
        companyId: company?.id,
        role,
      },
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: role === 'manager'
          ? 'Xin chào Quản lý! Tôi là **AI Copilot** của RealHome. Bạn cần tìm kiếm phòng trống hay kiểm tra thông tin gì?'
          : 'Xin chào! Tôi là **Trợ lý AI RealHome** 🤖. Bạn cần tìm phòng trọ/căn hộ dịch vụ theo tiêu chí nào (giá thuê, khu vực, nuôi mèo...)?',
      },
    ],
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Tự động cuộn xuống cuối + Tự động AIM/Focus vào ô nhập tin nhắn khi mở hoặc có tin mới
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isOpen]);

  // Tự động focus lại ô nhập sau khi AI hoàn thành trả lời
  useEffect(() => {
    if (!isLoading && isOpen) {
      inputRef.current?.focus();
    }
  }, [isLoading, isOpen]);

  // Hỗ trợ nút Quay lại (Back button) trên điện thoại Android / Safari
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ aiChatOpen: true }, '');
      
      const handlePopState = () => {
        setIsOpen(false);
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen]);

  const openChat = () => {
    setIsOpen(true);
  };
  
  const closeChat = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined' && window.history.state?.aiChatOpen) {
      window.history.back();
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  // Tự động điều chỉnh chiều cao ô nhập (Tối đa 3 dòng ~80px)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 80)}px`;
    }
  }, [input]);

  const handleCustomSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) handleSubmit(e);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleCustomSubmit(e as any);
      }
    }
  };

  // Touch Swipe Down Event Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      touchCurrentY.current = diff;
    }
  };

  const handleTouchEnd = () => {
    if (touchCurrentY.current > 70) {
      closeChat();
    }
    touchStartY.current = 0;
    touchCurrentY.current = 0;
  };

  return (
    <>
      {/* Nút Floating Button góc dưới bên phải - Màu vàng ánh kim đồng bộ với chữ Home trong Logo */}
      <Button
        onClick={openChat}
        className="fixed bottom-20 lg:bottom-6 right-6 h-13 w-13 md:h-14 md:w-14 rounded-full shadow-xl shadow-amber-500/30 bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 transition-all duration-300 hover:scale-110 z-50 flex items-center justify-center p-0 ring-4 ring-amber-400/30 border border-amber-300/40"
        aria-label="Mở Trợ lý AI"
      >
        <div className="relative flex items-center justify-center">
          <Bot className="h-6 w-6 text-slate-950 font-bold animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white"></span>
          </span>
        </div>
      </Button>

      {/* Backdrop mờ phía sau khi mở Chat trên Mobile */}
      {isOpen && (
        <div
          onClick={closeChat}
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* Thẻ Chat Slide-up dạng Bottom Sheet trên Mobile (chừa 15% khoảng trống phía trên, h-[85dvh], luôn thấy ô nhập) */}
      {isOpen && (
        <div
          className="fixed inset-x-0 bottom-0 sm:bottom-22 sm:right-6 sm:inset-x-auto w-full sm:w-[410px] h-[85dvh] sm:h-[580px] max-h-[85dvh] sm:max-h-[85vh] bg-white dark:bg-bg-base border-t border-x sm:border border-border-subtle rounded-t-[28px] sm:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
        >
          {/* Header Mobile Friendly kèm Vùng nhận diện Vuốt xuống (Swipe Handle) */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="bg-gradient-to-r from-accent to-accent-600 px-4 pt-2.5 pb-3.5 flex flex-col text-white shrink-0 shadow-md cursor-grab active:cursor-grabbing select-none"
          >
            {/* Thanh gạt vuốt xuống trên Mobile */}
            <div className="w-12 h-1.5 bg-white/40 rounded-full mx-auto mb-2.5 sm:hidden" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeChat}
                  className="h-8 w-8 text-white hover:bg-white/20 rounded-full sm:hidden -ml-1"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold font-heading text-sm leading-snug flex items-center gap-1.5">
                    {role === 'manager' ? 'RealHome AI Copilot' : 'Trợ lý AI RealHome'}
                    <Sparkles className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
                  </h3>
                  <p className="text-[11px] text-white/80">Tìm phòng thông minh • Tích hợp Gemini AI</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={closeChat}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
              >
                <ChevronDown className="h-5 w-5 sm:hidden" />
                <X className="h-5 w-5 hidden sm:block" />
              </Button>
            </div>
          </div>

          {/* Messages Area (min-h-0 đảm bảo flexbox cuộn tin nhắn ở giữa mà KHÔNG đẩy mất ô nhập ở dưới) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-bg-subtle/50 dark:bg-bg-base">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                    m.role === 'user'
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-accent-soft text-accent border border-accent/20'
                  }`}
                >
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-accent text-white rounded-tr-none'
                      : 'bg-white dark:bg-bg-subtle border border-border-subtle text-ink rounded-tl-none'
                  }`}
                >
                  {m.content ? (
                    <div className="prose prose-xs sm:prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-a:text-accent prose-a:font-semibold prose-a:underline hover:prose-a:text-accent-600">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : m.toolInvocations ? (
                    <div className="text-xs text-ink-muted italic flex items-center gap-2 py-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                      Đang tìm kiếm dữ liệu phòng trống trong database...
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-2.5">
                <div className="h-8 w-8 rounded-full bg-accent-soft text-accent border border-accent/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-white dark:bg-bg-subtle border border-border-subtle rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips cho Mobile */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-white dark:bg-bg-base border-t border-border-subtle overflow-x-auto whitespace-nowrap flex gap-1.5 no-scrollbar">
              {SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(sug)}
                  className="text-[11px] font-medium bg-bg-subtle hover:bg-accent-soft text-ink-muted hover:text-accent border border-border-subtle rounded-full px-3 py-1 transition-colors shrink-0"
                >
                  💡 {sug}
                </button>
              ))}
            </div>
          )}

          {/* Input Area (shrink-0 + safe area inset padding cho thiết bị di động Android / Redmi / iPhone) */}
          <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-bg-base border-t border-border-subtle shrink-0">
            <form onSubmit={handleCustomSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? "AI đang phản hồi..." : "Hỏi AI phòng trọ, khu vực, giá cả..."}
                className="flex-1 bg-bg-subtle border border-border-subtle rounded-2xl px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-ink placeholder:text-ink-muted/60 transition-all resize-none max-h-[80px] overflow-y-auto leading-relaxed disabled:opacity-80"
              />
              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  onClick={() => stop()}
                  title="Dừng phản hồi"
                  className="rounded-full bg-rose-500 hover:bg-rose-600 h-9 w-9 sm:h-10 sm:w-10 shrink-0 text-white shadow-md transition-all animate-pulse mb-0.5"
                >
                  <Square className="h-4 w-4 fill-white" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim()}
                  className="rounded-full bg-accent hover:bg-accent-500 h-9 w-9 sm:h-10 sm:w-10 shrink-0 text-white shadow-md disabled:opacity-50 transition-all mb-0.5"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
