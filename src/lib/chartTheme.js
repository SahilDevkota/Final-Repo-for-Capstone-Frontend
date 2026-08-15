import { useState, useEffect } from "react";

function readTokens() {
  const styles = getComputedStyle(document.body);
  const value = (name, fallback) =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
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
    const observer = new MutationObserver(() => setColors(readTokens()));

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}
