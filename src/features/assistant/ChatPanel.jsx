import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../../api/AuthContext";
import { sendChatMessage } from "../../lib/chat";

// Slide-over assistant, answering from the app's own data.
// Rendered outside the routes so navigating keeps the conversation.
export const OPEN_CHAT = "open-chat";

const SUGGESTIONS = [
  "How is my portfolio doing?",
  "What am I holding the most of?",
  "Which of my assets moved today?",
];

// Asset currently on screen, so questions can say "this"
function symbolFromPath(pathname) {
  const match = pathname.match(/^\/stock\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function ChatPanel() {
  const location = useLocation();
  const { AccessToken } = useAuth();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const listRef = useRef(null);
  const symbol = symbolFromPath(location.pathname);

  useEffect(() => {
    const toggle = () => setOpen((previous) => !previous);
    window.addEventListener(OPEN_CHAT, toggle);
    return () => window.removeEventListener(OPEN_CHAT, toggle);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Keep the newest message in view
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const ask = useCallback(
    async (text) => {
      const question = text.trim();
      if (!question || sending) return;

      setDraft("");
      setError(null);
      setSending(true);
      setMessages((previous) => [
        ...previous,
        { role: "user", text: question },
      ]);

      try {
        // Recent turns go with the question so follow-ups make sense
        const reply = await sendChatMessage(
          question,
          { symbol },
          messages.slice(-6)
        );

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: reply.answer,
            sources: reply.sources || [],
          },
        ]);
      } catch (err) {
        setError(err.message);
      } finally {
        setSending(false);
      }
    },
    [sending, symbol, messages]
  );

  if (!AccessToken) return null;

  return (
    <>
      {open && (
        <div className="chat-scrim" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`chat-panel${open ? " chat-panel-open" : ""}`}
        aria-hidden={!open}
        aria-label="Market assistant"
      >
        <header className="chat-panel-header">
          <div>
            <p className="eyebrow">Assistant</p>
            {symbol && (
              <span className="chat-context">Asking about {symbol}</span>
            )}
          </div>

          <button
            type="button"
            className="chat-close-button"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
          >
            Close
          </button>
        </header>

        <div className="chat-log" ref={listRef}>
          {messages.length === 0 && (
            <div className="chat-intro">
              <p>
                Ask about your holdings, your watchlist and the prices
                already collected for them.
              </p>

              <div className="chat-suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    className="chat-suggestion"
                    onClick={() => ask(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`chat-bubble chat-bubble-${message.role}`}
            >
              <p className="chat-bubble-text">{message.text}</p>

              {message.sources?.length > 0 && (
                <div className="chat-sources">
                  <span className="chat-sources-label">Based on</span>

                  {message.sources.map((source, i) => (
                    <span className="chat-source" key={i}>
                      <strong>{source.platform}</strong> {source.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="chat-bubble chat-bubble-assistant chat-bubble-pending">
              Thinking...
            </div>
          )}

          {error && <p className="form-error">{error}</p>}
        </div>

        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              symbol ? `Ask about ${symbol}...` : "Ask about your assets..."
            }
            aria-label="Message"
          />

          <button type="submit" disabled={sending || !draft.trim()}>
            Send
          </button>
        </form>

        <p className="chat-disclaimer">
          Analysis of collected data. Not financial advice.
        </p>
      </aside>
    </>
  );
}
