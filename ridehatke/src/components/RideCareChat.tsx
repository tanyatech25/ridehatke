"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "ai";
  content: string;
};

export default function RideCareChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hi! 👋 I'm **RideCare AI**. I can search rides for you by voice! Tap the 🎙️ mic and say — **'Check ride from Delhi to Agra'**" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // English-India (supports Hindi words too)

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
          // Auto-send the voice message
          handleSendVoice(transcript);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const handleSendVoice = async (voiceText: string) => {
    if (!voiceText.trim()) return;

    const userMsg = voiceText.trim();
    setMessages(prev => [...prev, { role: "user", content: `🎤 ${userMsg}` }]);
    setInput("");
    setIsTyping(true);

    try {
      const appLanguage = typeof window !== 'undefined' ? localStorage.getItem('appLanguage') || 'EN' : 'EN';
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, language: appLanguage })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: "ai", content: data.reply }]);

      // AGENTIC: If the AI detected a ride search, trigger it on the main page!
      if (data.action === "search_ride" && data.pickup && data.dropoff) {
        // Dispatch custom event that page.tsx listens to
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ridehatke-ai-search', {
            detail: { pickup: data.pickup, dropoff: data.dropoff }
          }));
          
          // Show confirmation after a brief delay
          setTimeout(() => {
            const lang = localStorage.getItem('appLanguage') || 'EN';
            setMessages(prev => [...prev, { 
              role: "ai", 
              content: lang === 'HI' 
                ? `✅ मैंने **${data.pickup}** से **${data.dropoff}** तक की राइड सर्च कर दी है! ऊपर स्क्रॉल करके रिज़ल्ट देखें। 🚕`
                : `✅ Done! I've searched rides from **${data.pickup}** to **${data.dropoff}** for you! Scroll up to see the results. 🚕`
            }]);
          }, 2000);
        }, 500);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I am having network issues right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleSendVoice(input);
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      setMessages(prev => [...prev, { role: "ai", content: "⚠️ Voice input is not supported in your browser. Please use Chrome or Edge." }]);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const toggleChat = () => setIsOpen(!isOpen);

  // Helper to parse basic markdown bolding
  const renderMessage = (text: string) => {
    return text.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button className={`chat-widget-btn ${isOpen ? 'open' : ''}`} onClick={toggleChat} aria-label="Open RideCare AI">
        {isOpen ? "✖" : "🤖"}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window animate-slide-up">
          <div className="chat-header">
            <span style={{ fontSize: '1.2rem' }}>🤖</span> 
            <div style={{ flex: 1 }}>
              <strong>RideCare AI</strong>
              <div style={{ fontSize: '0.75rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="online-dot"></span> {isListening ? '🎤 Listening...' : 'Online'}
              </div>
            </div>
            <div style={{ 
              fontSize: '0.6rem', 
              background: 'rgba(59, 130, 246, 0.15)', 
              color: '#3b82f6', 
              padding: '3px 8px', 
              borderRadius: '8px', 
              fontWeight: 700 
            }}>
              AGENTIC
            </div>
          </div>
          
          <div className="chat-body">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                {renderMessage(msg.content)}
              </div>
            ))}
            {isTyping && (
              <div className="chat-bubble bubble-ai typing-indicator">
                <span></span><span></span><span></span>
              </div>
            )}
            {isListening && (
              <div className="chat-bubble bubble-ai" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '10px', 
                  height: '10px', 
                  background: '#ef4444', 
                  borderRadius: '50%', 
                  animation: 'pulse 1s infinite'
                }}></span>
                <span style={{ fontWeight: 600 }}>Listening... Speak now!</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-footer" onSubmit={sendMessage}>
            {/* Mic Button */}
            <button 
              type="button" 
              onClick={toggleMic}
              style={{
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                border: 'none',
                background: isListening ? '#ef4444' : 'rgba(59, 130, 246, 0.15)',
                color: isListening ? 'white' : '#3b82f6',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                flexShrink: 0,
                animation: isListening ? 'pulse 1s infinite' : 'none'
              }}
            >
              🎙️
            </button>
            <input 
              type="text" 
              placeholder={isListening ? "Listening..." : "Say 'ride from X to Y'..."} 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="chat-input"
            />
            <button type="submit" className="chat-send-btn" disabled={isTyping || !input.trim()}>
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
