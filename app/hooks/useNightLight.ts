"use client";

import { useEffect, useState } from "react";

export function useNightLight() {
  const getMode = () => {
    const hour = new Date().getHours();
    return hour >= 5 && hour < 17 ? "daylight" : "coffee-night";
  };
  const [mode, setMode] = useState<"daylight" | "coffee-night">("daylight");

  useEffect(() => {
    const update = () => setMode(getMode());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return mode;
}

