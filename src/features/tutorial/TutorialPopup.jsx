import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../api/AuthContext";

// Reopened from the Help button; also opens by itself on a first visit
export const OPEN_TUTORIAL = "open-tutorial";

const SEEN_KEY = "tutorialSeen";

// Each step opens the screen it describes and points at the navbar item
// that leads there, so the reader knows where to click next time.
// `anchor` matches a data-tour attribute in Navbar.jsx.
const STEPS = [
  {
    anchor: "brand",
    path: "/dashboard",
    title: "Your workspace",
    text: "The title always brings you back here — a summary of your account and links into the rest of the app.",
  },
  {
    anchor: "explore",
    path: "/stocks",
    title: "Find an asset",
    text: "Search stocks, ETFs and crypto by symbol. Open one to see its price history and the news behind it.",
  },
  {
    anchor: "watchlist",
    path: "/watchlist",
    title: "Keep a watchlist",
    text: "Save the assets you care about so you do not have to search for them again.",
  },
  {
    anchor: "tools",
    path: "/portfolio",
    title: "Track what you own",
    text: "Under Tools: record what you bought, how much and at what price. Value and profit are recalculated from live prices each time you open it.",
  },
  {
    anchor: "tools",
    path: "/compare",
    title: "Compare two assets",
    text: "Also under Tools. Prices are rebased to percent change, so a $200 stock and a $90,000 coin stay comparable.",
  },
  {
    anchor: "assistant",
    path: "/dashboard",
    title: "Ask the assistant",
    text: "Ask about your own holdings and watchlist. Every answer shows the data it was based on.",
  },
];

const CARD_WIDTH = 430;
const GAP = 14;

export default function TutorialPopup() {
  const navigate = useNavigate();
  const { AccessToken } = useAuth();

  // Read during initialisation, so the first render already knows
  const [open, setOpen] = useState(() => !localStorage.getItem(SEEN_KEY));
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState(null);

  useEffect(() => {
    const reopen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_TUTORIAL, reopen);
    return () => window.removeEventListener(OPEN_TUTORIAL, reopen);
  }, []);

  // Take the reader to the screen this step is about
  useEffect(() => {
    if (open) navigate(STEPS[step].path);
  }, [open, step, navigate]);

  // Measure the navbar item this step points at. setTimeout rather than
  // requestAnimationFrame: rAF never fires while the tab is not
  // compositing, which would leave the highlight unplaced.
  useEffect(() => {
    if (!open) return;

    const anchor = STEPS[step].anchor;

    const measure = () => {
      const target = document.querySelector(`[data-tour="${anchor}"]`);
      if (!target) return;

      const r = target.getBoundingClientRect();
      // Tagged with its own anchor so a stale measurement can be spotted
      setSpot({
        anchor,
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    const timer = setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  const finish = useCallback(() => {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
    setStep(0);
    setSpot(null);
    navigate("/dashboard");
  }, [navigate]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, finish]);

  // The tour explains the signed-in app, so it waits for a session
  if (!open || !AccessToken) return null;

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  // Only trust a measurement taken for the step being shown
  const placed = spot && spot.anchor === current.anchor ? spot : null;

  // Positioned with transform rather than top/left: those are animated,
  // and a transition from `auto` does not interpolate, so the first frame
  // would stay pinned at 0,0.
  const cardStyle = placed
    ? {
        transform: `translate(${Math.min(
          Math.max(12, placed.left + placed.width / 2 - CARD_WIDTH / 2),
          window.innerWidth - CARD_WIDTH - 12
        )}px, ${placed.top + placed.height + GAP}px)`,
      }
    : undefined;

  return (
    <>
      {/* The ring's spread shadow dims the page and leaves this area clear,
          so one element does both jobs */}
      {placed ? (
        <div
          className="tour-ring"
          style={{
            transform: `translate(${placed.left - 8}px, ${placed.top - 6}px)`,
            width: placed.width + 16,
            height: placed.height + 12,
          }}
          onClick={finish}
        />
      ) : (
        <div className="tour-scrim" onClick={finish} />
      )}

      <div
        className={`tour-card${placed ? " tour-card-anchored" : ""}`}
        style={cardStyle}
        role="dialog"
        aria-label="Guided tour"
      >
        {placed && <span className="tour-arrow" />}

        <span className="tour-step-count">
          Step {step + 1} of {STEPS.length}
        </span>

        <h3>{current.title}</h3>
        <p>{current.text}</p>

        <div className="tour-dots">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={`tour-dot${index === step ? " tour-dot-active" : ""}`}
            />
          ))}
        </div>

        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={finish}>
            Skip
          </button>

          <div className="tour-actions-right">
            {step > 0 && (
              <button
                type="button"
                className="tour-back"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            )}

            <button
              type="button"
              className="tour-next"
              onClick={() => (last ? finish() : setStep((s) => s + 1))}
            >
              {last ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
