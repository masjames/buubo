"use client";

import { useEffect, useRef, useCallback } from "react";

const landingStyles = `
  .lp * { box-sizing: border-box; margin: 0; padding: 0; }
  .lp {
    background: #FFFCF5;
    color: #111;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    overflow-x: hidden;
  }
  .lp .wordmark {
    position: absolute;
    top: 28px;
    left: 28px;
    font-weight: 800;
    font-size: 18px;
    letter-spacing: -0.01em;
    color: #111;
    user-select: none;
  }
  .lp main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 24px 80px;
    text-align: center;
  }
  .lp h1 {
    font-size: 72px;
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 0.9;
    color: #111;
  }
  .lp .sub {
    font-size: 20px;
    line-height: 1.3;
    color: rgba(17,17,17,0.62);
    margin-top: 14px;
    font-weight: 500;
  }
  .lp .card {
    margin-top: 48px;
    background: #fff;
    border-radius: 28px;
    padding: 32px 32px 26px;
    width: 100%;
    max-width: 380px;
    border: 2px solid #111;
    box-shadow: 0 12px 40px rgba(0,0,0,0.08);
    position: relative;
    animation: lp-breathe 4s ease-in-out infinite;
    will-change: transform;
  }
  @keyframes lp-breathe {
    0%, 100% { transform: scale(1); box-shadow: 0 12px 40px rgba(0,0,0,0.08), 0 0 0 0 rgba(255,107,53,0); }
    50% { transform: scale(1.012); box-shadow: 0 18px 50px rgba(0,0,0,0.10), 0 0 60px 0 rgba(255,107,53,0.22); }
  }
  .lp .card-top { display: flex; justify-content: center; }
  .lp .pill {
    background: #FF6B35;
    color: #FFFCF5;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    padding: 6px 10px;
    border-radius: 999px;
    text-transform: uppercase;
    transition: background-color .25s ease;
  }
  .lp .task {
    font-size: 26px;
    font-weight: 700;
    margin: 18px 0 6px;
    letter-spacing: -0.01em;
  }
  .lp .timer {
    font-size: 64px;
    font-weight: 900;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    margin: 6px 0 10px;
    color: #111;
    height: 64px;
    opacity: 0;
    transition: opacity 0.35s ease;
  }
  .lp .timer.visible { visibility: visible; }
  .lp .next {
    font-size: 13px;
    color: #999;
    font-weight: 500;
    min-height: 18px;
  }
  .lp .cta-wrap {
    margin-top: 36px;
    width: 100%;
    max-width: 380px;
  }
  .lp .cta {
    background: #FF6B35;
    color: #FFFCF5;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.01em;
    padding: 20px 36px;
    border-radius: 18px;
    border: none;
    cursor: pointer;
    width: 100%;
    box-shadow: 0 10px 24px rgba(255,107,53,0.32), 0 2px 4px rgba(255,107,53,0.20);
    transition: transform .12s ease, box-shadow .12s ease, filter .12s ease,
                background-color .22s ease, padding .22s ease, font-size .22s ease,
                letter-spacing .22s ease;
    -webkit-tap-highlight-color: transparent;
    font-family: inherit;
  }
  .lp .cta:hover { transform: translateY(-2px) scale(1.01); box-shadow: 0 14px 32px rgba(255,107,53,0.38), 0 3px 6px rgba(255,107,53,0.24); filter: saturate(1.05); }
  .lp .cta:active { transform: translateY(0) scale(0.99); box-shadow: 0 6px 16px rgba(255,107,53,0.28); }
  .lp .cta:focus-visible { outline: 3px solid #111; outline-offset: 3px; }
  .lp .cta.picked {
    background: #111;
    font-size: 13px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 13px 20px;
    box-shadow: none;
  }
  .lp .cta.picked:hover { transform: none; filter: none; box-shadow: none; background: #2a2a2a; }
  .lp .cta-choices {
    display: flex;
    gap: 10px;
    margin-top: 10px;
    animation: lp-choices-in 0.36s cubic-bezier(.18,.82,.26,1) both;
  }
  .lp .cta-choices[hidden] { display: none; }
  @keyframes lp-choices-in {
    from { opacity: 0; transform: translateY(-10px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)     scale(1);    }
  }
  .lp .choice-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 16px 6px 12px;
    background: #fff;
    border: 2px solid #111;
    border-radius: 18px;
    cursor: pointer;
    text-decoration: none;
    color: #111;
    transition: background .15s, border-color .15s, transform .12s, box-shadow .12s;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
  }
  .lp .choice-btn:hover {
    background: #FFF5EF;
    border-color: #FF6B35;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(255,107,53,0.16);
  }
  .lp .choice-btn:active { transform: scale(0.97); }
  .lp .choice-ico  { font-size: 22px; line-height: 1; display: block; }
  .lp .choice-name { font-size: 12px; font-weight: 800; letter-spacing: 0.01em; display: block; }
  .lp .choice-sub  { font-size: 10px; font-weight: 600; color: #aaa; display: block; }
  .lp .trust {
    margin-top: 12px;
    font-size: 14px;
    color: rgba(17,17,17,0.55);
    font-weight: 500;
  }
  .lp .more-wrap {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 40;
  }
  .lp .more-btn {
    background: none;
    border: none;
    font-size: 13px;
    font-weight: 700;
    color: #FF6B35;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-style: dotted;
    text-decoration-color: rgba(255,107,53,0.45);
    cursor: pointer;
    padding: 8px 10px;
    -webkit-tap-highlight-color: transparent;
    font-family: inherit;
  }
  .lp .more-btn:hover { text-decoration-color: #FF6B35; }
  .lp .modal { position: fixed; inset: 0; z-index: 200; display: none; }
  .lp .modal.open { display: block; }
  .lp .modal-backdrop { position: absolute; inset: 0; background: #FFFCF5; }
  .lp .modal-panel { position: relative; width: 100%; height: 100%; overflow-y: auto; background: #FFFCF5; animation: lp-modalIn .28s cubic-bezier(.2,.7,.2,1); }
  @keyframes lp-modalIn { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  .lp .modal-close { position: absolute; top: 14px; right: 18px; width: 44px; height: 44px; border: none; background: none; font-size: 34px; line-height: 1; color: #111; cursor: pointer; font-weight: 300; z-index: 5; }
  .lp .modal-close:hover { color: #FF6B35; }
  .lp .modal-grid { display: grid; grid-template-columns: 45% 55%; min-height: 100vh; max-width: 1200px; margin: 0 auto; padding: 80px 56px; gap: 64px; align-items: start; }
  .lp .modal-left { text-align: left; }
  .lp .modal-eyebrow { font-size: 13px; color: #9a9a9a; font-weight: 600; letter-spacing: .02em; margin-bottom: 14px; }
  .lp .modal-left h2 { font-size: 54px; font-weight: 900; letter-spacing: -0.03em; line-height: 0.95; margin-bottom: 28px; color: #111; }
  .lp .modal-left p { font-size: 19px; line-height: 1.6; color: rgba(17,17,17,0.78); max-width: 65ch; margin-bottom: 18px; font-weight: 500; }
  .lp .modal-right { display: flex; align-items: center; justify-content: center; width: 100%; overflow: hidden; }
  .lp .demo-stage {
    position: relative;
    width: 100%;
    overflow: hidden;
    padding: 20px 0;
    mask-image: linear-gradient(to right, transparent 0, black 80px, black calc(100% - 80px), transparent 100%);
    -webkit-mask-image: linear-gradient(to right, transparent 0, black 80px, black calc(100% - 80px), transparent 100%);
  }
  .lp .demo-track {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    width: max-content;
    will-change: transform;
  }
  .lp .demo-item {
    width: 420px;
    margin-right: 40px;
    flex-shrink: 0;
    height: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .lp .demo-label { margin-top: 18px; font-size: 13px; color: #8a8a8a; font-weight: 600; letter-spacing: .01em; }
  .lp .demo-item[data-demo="android"] .phone { transform: scale(0.72); transform-origin: center; }
  .lp .mac-window { width: 420px; max-width: 100%; background: #fff; border: 2px solid #111; border-radius: 14px; overflow: hidden; box-shadow: 0 18px 50px rgba(0,0,0,.12); position: relative; }
  .lp .mac-bar { height: 30px; background: #111; color: #FFFCF5; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; position: relative; padding: 0 12px; }
  .lp .mac-bar .apple { position: absolute; left: 12px; font-size: 14px; opacity: .9; }
  .lp .mac-bar .mac-right { position: absolute; right: 12px; opacity: .6; }
  .lp .mac-desktop { height: 190px; background: linear-gradient(180deg,#f6f3eb 0%,#FFFCF5 100%); }
  .lp .mac-dropdown { position: absolute; top: 38px; left: 50%; transform: translateX(-50%); background: #fff; border: 2px solid #111; border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; box-shadow: 0 12px 30px rgba(0,0,0,.15); white-space: nowrap; animation: lp-drop .5s ease .1s both; }
  @keyframes lp-drop { from { opacity:0; transform:translateX(-50%) translateY(-8px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
  .lp .mac-dropdown .pill.tiny { font-size: 10px; padding: 4px 8px; background: #FF6B35; color: #FFFCF5; border-radius: 999px; font-weight: 800; letter-spacing: .08em; }
  .lp .mac-dropdown span:nth-child(2) { font-weight: 700; font-size: 14px; }
  .lp .mac-time { font-variant-numeric: tabular-nums; font-weight: 800; color: #FF6B35; }
  .lp .phone { width: 270px; height: 540px; background: #111; border-radius: 40px; padding: 10px; box-shadow: 0 24px 60px rgba(0,0,0,.18), inset 0 0 0 2px #222; position: relative; }
  .lp .phone::before { content: ""; position: absolute; inset: 10px; background: #FFFCF5; border-radius: 30px; }
  .lp .phone-notch { position: absolute; top: 18px; left: 50%; transform: translateX(-50%); width: 90px; height: 18px; background: #111; border-radius: 0 0 10px 10px; z-index: 2; }
  .lp .share-sheet { position: absolute; left: 20px; right: 20px; bottom: 20px; background: #fff; border: 2px solid #111; border-radius: 20px; padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,.12); z-index: 1; }
  .lp .share-handle { width: 36px; height: 4px; background: #ddd; border-radius: 2px; margin: 0 auto 12px; }
  .lp .share-title { font-weight: 800; font-size: 15px; margin-bottom: 10px; }
  .lp .share-input { border: 2px solid #111; border-radius: 10px; padding: 10px 12px; font-weight: 600; font-size: 14px; background: #FFFCF5; margin-bottom: 10px; }
  .lp .share-row { display: flex; align-items: center; justify-content: space-between; }
  .lp .share-tag { font-size: 12px; background: #f0f0f0; padding: 4px 8px; border-radius: 6px; font-weight: 600; color: #555; }
  .lp .share-add { background: #FF6B35; color: #fff; border: none; padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 12px; }
  .lp .browser { width: 440px; max-width: 100%; background: #fff; border: 2px solid #111; border-radius: 14px; overflow: hidden; box-shadow: 0 18px 50px rgba(0,0,0,.12); }
  .lp .browser-bar { height: 34px; background: #f5f2ea; border-bottom: 2px solid #111; display: flex; align-items: center; padding: 0 12px; gap: 10px; }
  .lp .dots { display: flex; gap: 5px; }
  .lp .dots i { width: 10px; height: 10px; border-radius: 50%; background: #111; opacity: .2; display: block; }
  .lp .dots i:nth-child(1) { opacity: .35; }
  .lp .browser-url { font-size: 12px; font-weight: 600; color: #777; background: #fff; border: 1px solid #e5ddd0; padding: 3px 8px; border-radius: 6px; }
  .lp .browser-body { padding: 28px; display: flex; align-items: center; justify-content: center; background: #FFFCF5; }
  .lp .mini-card { background: #fff; border: 2px solid #111; border-radius: 20px; padding: 22px 24px; text-align: center; width: 260px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
  .lp .mini-card .pill.tiny { background: #FF6B35; color: #FFFCF5; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 999px; letter-spacing: .08em; text-transform: uppercase; }
  .lp .mini-task { font-weight: 700; margin: 12px 0 6px; font-size: 18px; }
  .lp .mini-timer { font-size: 40px; font-weight: 900; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  @media (max-width: 980px) {
    .lp .modal-grid { grid-template-columns: 1fr; padding: 72px 24px 40px; gap: 48px; min-height: auto; }
    .lp .modal-left h2 { font-size: 42px; }
    .lp .modal-left p { font-size: 17px; }
  }
  @media (max-width: 520px) {
    .lp h1 { font-size: 60px; }
    .lp .card { margin-top: 36px; padding: 28px 24px; border-radius: 24px; }
    .lp .timer { font-size: 56px; height: 56px; }
    .lp .cta { padding: 18px 28px; font-size: 20px; border-radius: 16px; }
    .lp .cta.picked { font-size: 12px; padding: 11px 16px; }
    .lp .sub { font-size: 18px; }
    .lp .modal-close { top: 8px; right: 10px; }
    .lp .modal-grid { padding: 64px 20px 32px; }
    .lp .modal-left h2 { font-size: 36px; }
    .lp .mac-window, .lp .browser { width: 100%; }
    .lp .phone { transform: scale(.9); }
    .lp .demo-item[data-demo="android"] .phone { transform: scale(0.68); }
  }
  @media (max-width: 390px) {
    .lp h1 { font-size: 52px; }
    .lp .wordmark { top: 20px; left: 20px; }
    .lp main { padding: 32px 20px 70px; }
  }
  @media (max-height: 700px) {
    .lp h1 { font-size: 56px; }
    .lp .card { margin-top: 28px; padding: 24px; }
    .lp .timer { font-size: 52px; height: 52px; }
    .lp .cta-wrap { margin-top: 28px; }
    .lp main { justify-content: flex-start; padding-top: 84px; }
  }
`;

const STATES = [
  { pill: "CAPTURE", color: "#6B7280", showTimer: false, sub: "dumped to Things" },
  { pill: "NEXT", color: "#F59E0B", showTimer: false, sub: "waiting in Next Actions" },
  { pill: "DOING", color: "#FF6B35", showTimer: true, sub: "focus now" },
];

export default function LandingPage() {
  const pillRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const choicesRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const choicesOpenRef = useRef(false);

  const showState = useCallback((idx: number) => {
    const s = STATES[idx];
    if (pillRef.current) {
      pillRef.current.textContent = s.pill;
      pillRef.current.style.background = s.color;
    }
    if (subRef.current) subRef.current.textContent = s.sub;
    if (timerRef.current) {
      timerRef.current.style.opacity = s.showTimer ? "1" : "0";
    }
  }, []);

  // Card state cycling + timer
  useEffect(() => {
    let idx = 0;
    let secs = 0;
    let tick: ReturnType<typeof setInterval> | null = null;

    function cycleState() {
      const s = STATES[idx];
      showState(idx);
      if (s.showTimer && timerRef.current) {
        secs = 0;
        timerRef.current.textContent = "00:00";
        if (tick) clearInterval(tick);
        tick = setInterval(() => {
          secs++;
          const m = String(Math.floor(secs / 60)).padStart(2, "0");
          const ss = String(secs % 60).padStart(2, "0");
          if (timerRef.current) timerRef.current.textContent = `${m}:${ss}`;
        }, 1000);
      } else {
        if (tick) clearInterval(tick);
      }
      idx = (idx + 1) % 3;
    }

    cycleState();
    const interval = setInterval(cycleState, 3000);
    return () => {
      clearInterval(interval);
      if (tick) clearInterval(tick);
    };
  }, [showState]);

  // Infinite scroll on demo reel
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let offset = 0;
    let lastTime = performance.now();
    let paused = false;
    const speed = 34;
    let rafId: number;

    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    track.addEventListener("mouseenter", onEnter);
    track.addEventListener("mouseleave", onLeave);

    function getSlotWidth() {
      const first = track!.querySelector(".demo-item") as HTMLElement | null;
      if (!first) return 0;
      const styles = getComputedStyle(first);
      return first.offsetWidth + parseFloat(styles.marginRight || "0");
    }

    function animate(now: number) {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      if (!paused) {
        offset -= delta * speed;
        let slotWidth = getSlotWidth();
        while (slotWidth && Math.abs(offset) >= slotWidth) {
          offset += slotWidth;
          if (track!.firstElementChild) track!.appendChild(track!.firstElementChild);
          slotWidth = getSlotWidth();
        }
        track!.style.transform = `translateX(${offset}px)`;
      }
      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      track.removeEventListener("mouseenter", onEnter);
      track.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // CTA click → platform picker
  const handleCtaClick = useCallback(() => {
    const cta = ctaRef.current;
    const choices = choicesRef.current;
    const card = cardRef.current;
    if (!cta || !choices) return;

    if (choicesOpenRef.current) {
      choicesOpenRef.current = false;
      cta.classList.remove("picked");
      cta.textContent = "Start now →";
      choices.setAttribute("hidden", "");
    } else {
      choicesOpenRef.current = true;
      cta.classList.add("picked");
      cta.textContent = "Pick your platform";
      choices.removeAttribute("hidden");
      choices.style.animation = "none";
      void choices.offsetWidth;
      choices.style.animation = "";
    }
    if (card) {
      card.style.animation = "none";
      setTimeout(() => { card.style.animation = "lp-breathe 4s ease-in-out infinite"; }, 10);
    }
  }, []);

  // Close choices on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (choicesOpenRef.current && ctaRef.current && choicesRef.current) {
        if (!ctaRef.current.contains(e.target as Node) && !choicesRef.current.contains(e.target as Node)) {
          choicesOpenRef.current = false;
          ctaRef.current.classList.remove("picked");
          ctaRef.current.textContent = "Start now →";
          choicesRef.current.setAttribute("hidden", "");
        }
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Modal
  const openModal = useCallback(() => {
    const modal = modalRef.current;
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }, []);

  const closeModal = useCallback(() => {
    const modal = modalRef.current;
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && modalRef.current?.classList.contains("open")) closeModal();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [closeModal]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: landingStyles }} />
      <div className="lp">
        <div className="wordmark">buubo</div>

        <main>
          <h1>Do one thing.</h1>
          <p className="sub">Buubo hides everything else.</p>

          <div className="card" ref={cardRef} aria-label="Current task">
            <div className="card-top">
              <span className="pill" ref={pillRef} style={{ background: "#6B7280" }}>CAPTURE</span>
            </div>
            <div className="task">Write landing page</div>
            <div className="timer" ref={timerRef} aria-live="off">00:00</div>
            <div className="next" ref={subRef}>dumped to Things</div>
          </div>

          <div className="cta-wrap">
            <button className="cta" ref={ctaRef} aria-label="Start now" onClick={handleCtaClick}>
              Start now →
            </button>
            <div className="cta-choices" ref={choicesRef} hidden>
              <a href="#" className="choice-btn">
                <span className="choice-ico">💻</span>
                <span className="choice-name">Mac App</span>
                <span className="choice-sub">Download</span>
              </a>
              <a href="#" className="choice-btn">
                <span className="choice-ico">📱</span>
                <span className="choice-name">Android</span>
                <span className="choice-sub">Download</span>
              </a>
              <a href="/app" className="choice-btn">
                <span className="choice-ico">🌐</span>
                <span className="choice-name">Web App</span>
                <span className="choice-sub">Launch →</span>
              </a>
            </div>
          </div>
          <div className="trust">No signup. No AI. Free.</div>
        </main>

        <div className="more-wrap">
          <button className="more-btn" onClick={openModal}>more!!</button>
        </div>

        <div className="modal" ref={modalRef} aria-hidden="true" role="dialog" aria-modal="true">
          <div className="modal-backdrop" onClick={closeModal}></div>
          <div className="modal-panel">
            <button className="modal-close" aria-label="Close" onClick={closeModal}>×</button>
            <div className="modal-grid">
              <div className="modal-left">
                <div className="modal-eyebrow">what is this?</div>
                <h2>Two rooms. One rule.</h2>
                <p>Buubo is for brains that get noisy. You dump everything into Things, no sorting, no priorities, no tags to overthink. It{"'"}s just a bucket so your head is empty.</p>
                <p>Then you pick ONE thing for Doing. Flow shows only that task with a timer. Mac menu bar, Android share, and web all sync to the same Doing. No AI planning, no backlog guilt, no chat.</p>
              </div>
              <div className="modal-right">
                <div className="demo-stage">
                  <div className="demo-track" ref={trackRef}>
                    <div className="demo-item" data-demo="mac">
                      <div className="mac-window">
                        <div className="mac-bar">
                          <span className="apple"></span>
                          <span className="mac-app">buubo</span>
                          <span className="mac-right">⌃⌥⌘</span>
                        </div>
                        <div className="mac-dropdown">
                          <span className="pill tiny">DOING</span>
                          <span>Write landing page</span>
                          <span className="mac-time">23:14</span>
                        </div>
                        <div className="mac-desktop"></div>
                      </div>
                      <div className="demo-label">macOS menu bar</div>
                    </div>
                    <div className="demo-item" data-demo="android">
                      <div className="phone">
                        <div className="phone-notch"></div>
                        <div className="share-sheet">
                          <div className="share-handle"></div>
                          <div className="share-title">Add to Buubo</div>
                          <div className="share-input">Write landing page</div>
                          <div className="share-row">
                            <span className="share-tag">Things</span>
                            <button className="share-add" tabIndex={-1}>Add</button>
                          </div>
                        </div>
                      </div>
                      <div className="demo-label">Android share</div>
                    </div>
                    <div className="demo-item" data-demo="web">
                      <div className="browser">
                        <div className="browser-bar">
                          <span className="dots"><i></i><i></i><i></i></span>
                          <span className="browser-url">buubo.app</span>
                        </div>
                        <div className="browser-body">
                          <div className="mini-card">
                            <span className="pill tiny">DOING</span>
                            <div className="mini-task">Write landing page</div>
                            <div className="mini-timer">23:14</div>
                          </div>
                        </div>
                      </div>
                      <div className="demo-label">Web</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
