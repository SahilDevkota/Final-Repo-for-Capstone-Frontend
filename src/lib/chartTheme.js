import { useState, useEffect } from "react";

// Recharts takes colours as props, which CSS cannot reach, so the tokens
// are read from the stylesheet and re-read when the theme class changes.
function readTokens() {
  // Read from <body>, not <html>: the dark palette is declared as
  // `body.dark-theme`, so those overrides do not exist on the root element
  const styles = getComputedStyle(document.body);
  const value = (name, fallback) =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
    // The two series on a comparison chart. Both need to read as data;
    // --muted is the colour of secondary text and looked like a gridline.
    up:     value("--chart-a", "#7aa300"),
    accent: value("--chart-b", "#2f6fd0"),

    down:   value("--red", "#d84a5d"),
    grid:   value("--border", "#d5dee6"),
    axis:   value("--muted", "#657484"),
    tick:   value("--muted", "#657484"),
  };
}

export function useChartColors() {
  const [colors, setColors] = useState(readTokens);

  useEffect(() => {
    // The navbar toggles a class on <body>, so watch that rather than
    // asking every component to re-render on a custom event
    const observer = new MutationObserver(() => setColors(readTokens()));

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}
