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
  const { user, profile, company, role: userRole } = useAuth();
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
        role: userRole || role,
        userId: user?.id,
        landlordId: profile?.landlord_id,
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

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isLoading && isOpen) {
      inputRef.current?.focus();
    }
  }, [isLoading, isOpen]);

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

  // Dynamic Visual Viewport Height & Offset state for Mobile Keyboard handling
  const [viewportStyle, setViewportStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll on mobile when chat is open to prevent page scrolling behind modal
    const originalOverflow = document.body.style.overflow;
    if (window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    }

    const updateViewport = () => {
      if (window.innerWidth >= 640) {
        setViewportStyle({});
        return;
      }

      if (window.visualViewport) {
        const height = window.visualViewport.height;
        const top = window.visualViewport.offsetTop;
        setViewportStyle({
          position: 'fixed',
          top: `${top}px`,
          left: '0px',
          right: '0px',
          height: `${height}px`,
          maxHeight: `${height}px`,
        });
      } else {
        setViewportStyle({
          position: 'fixed',
          top: '0px',
          left: '0px',
          right: '0px',
          bottom: '0px',
          height: '100dvh',
        });
      }
    };

    updateViewport();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }

    window.addEventListener('resize', updateViewport);

    return () => {
      document.body.style.overflow = originalOverflow;
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
      window.removeEventListener('resize', updateViewport);
    };
  }, [isOpen]);

  const openChat = () => setIsOpen(true);
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

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 80)}px`;
    }
  }, [input]);

  const handleCustomSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      handleSubmit(e, {
        options: {
          body: {
            data: {
              companyId: company?.id || profile?.company_id,
              role: userRole || profile?.role || role,
              userId: user?.id,
              landlordId: profile?.landlord_id,
            },
          },
        },
      });
    }
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
      <Button
        onClick={openChat}
        className="fixed bottom-20 lg:bottom-6 right-5 lg:right-6 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-xl shadow-amber-500/30 bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 transition-all duration-300 hover:scale-110 z-40 flex items-center justify-center p-0 ring-4 ring-amber-400/30 border border-amber-300/40"
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

      {isOpen && (
        <div
          onClick={closeChat}
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 transition-opacity animate-in fade-in duration-200"
        />
      )}

      {isOpen && (
        <div
          style={viewportStyle}
          className="fixed inset-x-0 bottom-0 sm:bottom-22 sm:right-6 sm:inset-x-auto w-full sm:w-[410px] h-[100dvh] sm:h-[580px] max-h-full sm:max-h-[85vh] bg-white dark:bg-bg-base border-t border-x sm:border border-border-subtle rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
        >
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="bg-gradient-to-r from-amber-600 to-amber-700 px-4 pt-2.5 pb-3.5 flex flex-col text-white shrink-0 shadow-md cursor-grab active:cursor-grabbing select-none"
          >
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
                  <p className="text-[11px] text-white/80">Tìm phòng thông minh • Gemini AI</p>
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

          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-bg-subtle/50 dark:bg-bg-base">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                    m.role === 'user'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-amber-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-bg-subtle border border-border-subtle text-ink rounded-tl-none'
                  }`}
                >
                  {m.content ? (
                    <div className="prose prose-xs sm:prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-a:text-amber-600 prose-a:font-semibold prose-a:underline hover:prose-a:text-amber-700">
                      <ReactMarkdown
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-2 rounded-xl border border-amber-200 dark:border-border-subtle shadow-sm bg-amber-50/30 dark:bg-bg-base/50">
                              <table className="min-w-full divide-y divide-amber-200 dark:divide-border-subtle text-xs" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-amber-500/10 text-amber-950 font-semibold" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-2.5 py-1.5 text-left font-semibold text-[11px] whitespace-nowrap text-amber-900 dark:text-amber-300" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-2.5 py-1.5 border-t border-amber-100 dark:border-border-subtle text-[11px] align-top text-ink" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-outside ml-4 space-y-1 my-1.5" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-outside ml-4 space-y-1 my-1.5" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
                          ),
                          a: ({ node, ...props }) => (
                            <a className="text-amber-600 font-semibold underline hover:text-amber-700 inline-flex items-center gap-0.5" target="_blank" rel="noopener noreferrer" {...props} />
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : m.toolInvocations ? (
                    <div className="text-xs text-ink-muted italic flex items-center gap-2 py-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                      Đang truy vấn CSDL phòng trống...
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-2.5">
                <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-white dark:bg-bg-subtle border border-border-subtle rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-white dark:bg-bg-base border-t border-border-subtle overflow-x-auto whitespace-nowrap flex gap-1.5 no-scrollbar">
              {SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(sug)}
                  className="text-[11px] font-medium bg-bg-subtle hover:bg-amber-100 text-ink-muted hover:text-amber-950 border border-border-subtle rounded-full px-3 py-1 transition-colors shrink-0"
                >
                  💡 {sug}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-bg-base border-t border-border-subtle shrink-0">
            <form onSubmit={handleCustomSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? "AI đang phản hồi..." : "Hỏi AI phòng trọ, khu vực, giá cả..."}
                className="flex-1 bg-bg-subtle border border-border-subtle rounded-2xl px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 text-ink placeholder:text-ink-muted/60 transition-all resize-none max-h-[80px] overflow-y-auto leading-relaxed disabled:opacity-80"
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
                  className="rounded-full bg-amber-600 hover:bg-amber-700 h-9 w-9 sm:h-10 sm:w-10 shrink-0 text-white shadow-md disabled:opacity-50 transition-all mb-0.5"
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
