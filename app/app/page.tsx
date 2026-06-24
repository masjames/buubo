"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DROP_REASONS,
  WIP_LIMITS,
  formatTime,
  generateAiPrompt,
  normalizeGTDState,
  restoreDoneState,
  type CanonicalGTDState,
} from "@/shared/viga-state";
import { getVisibleThingActions } from "@/shared/viga-actions";
import { useCapture } from "./hooks/useCapture";
import { useNightLight } from "./hooks/useNightLight";
import { storage } from "./hooks/storage";
import { useThings } from "./hooks/useThings";
import type { Thing } from "./types";

type Tab = "flow" | "things";
type SheetState =
  | { kind: "done" | "drop" | "stuck"; thing: Thing }
  | { kind: "wip"; title: string }
  | { kind: "grass" }
  | null;

const TAB_ORDER: Tab[] = ["flow", "things"];
const REASON_LABELS: Record<string, string> = {
  not_important: "Not important",
  too_big: "Too big",
  wrong_timing: "Wrong timing",
  need_clarity: "Need clarity",
  waiting_on_someone: "Waiting on someone",
};

function sameLocalDay(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

function age(value?: string) {
  if (!value) return "just now";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1_440)}d`;
}

function Modal({ children, sheet = false, onClose }: {
  children: React.ReactNode;
  sheet?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={sheet ? "modal sheet" : "modal"} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}

function CaptureModal({ capture, nextCount, onClose, onWip }: {
  capture: (title: string, options: { gtdState: CanonicalGTDState; isUrgent?: boolean }) => Promise<Thing | null>;
  nextCount: number;
  onClose: () => void;
  onWip: (title: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CanonicalGTDState>("inbox");
  const [urgent, setUrgent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = input.current?.value.trim() || "";
    if (!title) return;
    if (state === "next_action" && nextCount >= WIP_LIMITS.maxNextAction) {
      onWip(title);
      return;
    }
    await capture(title, { gtdState: state, isUrgent: urgent });
    onClose();
  };

  return (
    <Modal onClose={onClose} sheet>
      <p className="eyebrow">Capture</p>
      <h2>What&apos;s on your mind?</h2>
      <form onSubmit={submit} className="stack">
        <input ref={input} autoFocus className="text-input" placeholder="A thought, task, or loose end" />
        <div className="segmented">
          {(["inbox", "doing", "next_action"] as CanonicalGTDState[]).map((option) => (
            <button type="button" className={state === option ? "active" : ""} onClick={() => setState(option)} key={option}>
              {option === "inbox" ? "Inbox" : option === "doing" ? "Do Now" : "Next Action"}
            </button>
          ))}
        </div>
        {state !== "inbox" && (
          <label className="check"><input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} /> Mark as urgent</label>
        )}
        <button className="primary" type="submit">Capture it</button>
      </form>
    </Modal>
  );
}

function Timer({ thing }: { thing: Thing }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const base = Number(thing.metadata?.total_run_time_ms) || 0;
  const live = thing.metadata?.last_started_at ? Math.max(0, now - new Date(thing.metadata.last_started_at).getTime()) : 0;
  return <span className="timer">{formatTime(base + live)}</span>;
}


function CompactNow({ things }: { things: Thing[] }) {
  const doing = things.find((thing) => normalizeGTDState(thing) === "doing");
  return (
    <aside className="compact-now" aria-label="Current doing item">
      <span>Now</span>
      <strong>{doing ? doing.title : "Clear"}</strong>
      {doing ? <Timer thing={doing} /> : <small>—</small>}
    </aside>
  );
}

function FlowDesk({ things, syncingId, update, setSheet, capture }: {
  things: Thing[];
  syncingId: string | null;
  update: ReturnType<typeof useThings>["updateThingState"];
  setSheet: (sheet: SheetState) => void;
  capture: (title: string, options: { gtdState: CanonicalGTDState; isUrgent?: boolean }) => Promise<Thing | null>;
}) {
  const doing = things.find((thing) => normalizeGTDState(thing) === "doing");
  const next = things.filter((thing) => normalizeGTDState(thing) === "next_action").slice(0, 3);
  const promote = async (thing: Thing) => {
    if (doing && doing.id !== thing.id) await update(doing, "next_action");
    await update(thing, "doing");
  };

  return (
    <section className="view flow-view">
      {doing ? (
        <article className="now-card">
          <div className="now-top"><span>NOW</span>{doing.is_pending && <span className="sync-badge">Queued</span>}</div>
          <h2>{doing.title}</h2>
          {doing.metadata?.first_physical_action && <p className="hint">First: {doing.metadata.first_physical_action}</p>}
          <Timer thing={doing} />
          <div className="action-grid">
            {getVisibleThingActions("doing", "flow").map((action) => (
              <button key={action} disabled={syncingId === doing.id} onClick={() => {
                if (action === "pause") void update(doing, "next_action");
                if (action === "done" || action === "drop" || action === "stuck") setSheet({ kind: action, thing: doing });
              }}>
                {action === "pause" ? "⏸ Pause" : action === "done" ? "✓ Done" : action === "drop" ? "🗑 Trash" : "⚡ Stuck"}
              </button>
            ))}
          </div>
        </article>
      ) : (
        <div className="ignition-layer stack" style={{ padding: "0 20px" }}>
          <p className="eyebrow">Why are we starting?</p>
          <form className="stack" onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const why = (form.elements.namedItem("why") as HTMLInputElement).value;
            const action = (form.elements.namedItem("action") as HTMLInputElement).value;
            if (why.trim()) {
              const thing = await capture(why.trim(), { gtdState: "doing" });
              if (thing && action.trim()) {
                await update(thing, "doing", { first_physical_action: action.trim() });
              }
            }
          }}>
            <input name="why" className="text-input" placeholder="Why this matters" required />
            <input name="action" className="text-input" placeholder="First physical action" />
            <button className="primary" type="submit">Start 5 min</button>
          </form>
        </div>
      )}
      <section className="next-up">
        <div className="section-heading"><h2>Next Up</h2><span>{next.length}/{WIP_LIMITS.maxNextAction}</span></div>
        {next.length ? next.map((thing) => (
          <button className="next-row" key={thing.id} disabled={thing.is_pending || syncingId === thing.id} onClick={() => void promote(thing)}>
            <span><strong>{thing.title}</strong>{thing.metadata?.is_urgent && <em>Urgent</em>}</span>
            <small>{formatTime(thing.metadata?.total_run_time_ms)} <b>▶</b></small>
          </button>
        )) : <p className="empty-copy">Nothing queued.</p>}
      </section>
    </section>
  );
}

function ThingRow({ thing, update }: { thing: Thing; update: ReturnType<typeof useThings>["updateThingState"] }) {
  const [open, setOpen] = useState(false);
  const state = normalizeGTDState(thing);
  const actions = getVisibleThingActions(state, "things");
  const labels: Record<string, string> = { next_action: "▸ Next", doing: "▶ Do", waiting: "⏳ Wait", inbox: "📥 Inbox", archive: "🗑 Trash", restore: "↩ Restore" };
  return (
    <article className={`thing-row ${open ? "expanded" : ""}`}>
      <button className="thing-main" onClick={() => setOpen((value) => !value)}>
        <span><strong>{thing.title}</strong>{thing.is_pending && <small className="sync-badge">Syncing</small>}</span>
        <small>{state === "inbox" ? `${age(thing.metadata?.undecided_since || thing.created_at)} in head` : (state === "done" || state === "dropped") ? `was ${String(thing.metadata?.previous_gtd_state || "inbox").replace("_", " ")}` : open ? "Close" : "Open"}</small>
      </button>
      {open && <div className="row-actions">{actions.map((action) => (
        <button key={action} disabled={thing.is_pending} onClick={() => {
          const target = action === "archive" ? "done" : action === "restore" ? restoreDoneState(thing) : action;
          void update(thing, target as CanonicalGTDState);
        }}>{labels[action]}</button>
      ))}</div>}
    </article>
  );
}

function ThingsRoom({ things, update, capture }: { things: Thing[]; update: ReturnType<typeof useThings>["updateThingState"]; capture: (title: string, options: { gtdState: CanonicalGTDState; isUrgent?: boolean }) => Promise<Thing | null> }) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [title, setTitle] = useState("");
  const groups = (["inbox", "waiting"] as CanonicalGTDState[]).map((state) => ({ state, things: things.filter((thing) => normalizeGTDState(thing) === state) }));
  const archived = things.filter((thing) => ["done", "dropped"].includes(normalizeGTDState(thing)));
  
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      await capture(title.trim(), { gtdState: "inbox" });
      setTitle("");
    }
  };

  return (
    <section className="view">
      <form onSubmit={onSubmit} style={{ padding: "0 20px 16px" }}>
        <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Capture a thought, task, or loose end..." />
      </form>
      {groups.map(({ state, things: rows }) => (
        <section className="thing-section" key={state}>
          <div className="section-heading"><h2>{state[0].toUpperCase() + state.slice(1)}</h2><span>{rows.length}</span></div>
          {rows.map((thing) => <ThingRow key={thing.id} thing={thing} update={update} />)}
          {!rows.length && <p className="empty-copy">Clear</p>}
        </section>
      ))}
      <section className="thing-section archive">
        <button className="archive-toggle" onClick={() => setArchiveOpen((value) => !value)}><span>{archiveOpen ? "▼" : "▶"} Archive</span><span>{archived.length}</span></button>
        {archiveOpen && archived.map((thing) => <ThingRow key={thing.id} thing={thing} update={update} />)}
      </section>
      <div style={{ display: "flex", gap: "10px", padding: "20px" }}>
        <button className="secondary" onClick={() => alert('Settings UI placeholder')}>⚙ Settings</button>
        <button className="secondary" onClick={() => { alert('You can safely close this tab.'); window.close(); }}>⏻ Quit</button>
      </div>
    </section>
  );
}



function EndDayRitual({ things, capture, update, onClose, onDone }: {
  things: Thing[];
  capture: (title: string, options: { gtdState: CanonicalGTDState; isUrgent?: boolean }) => Promise<Thing | null>;
  update: ReturnType<typeof useThings>["updateThingState"];
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(1);
  const [custom, setCustom] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const next = things.filter((thing) => normalizeGTDState(thing) === "next_action");
  return <Modal onClose={onClose}>
    <p className="eyebrow">End day · {step}/2</p>
    {step === 1 && <div className="stack"><h2>Still open?</h2><input ref={input} autoFocus className="text-input" placeholder="One loose end" /><div className="modal-actions"><button className="secondary" onClick={() => setStep(2)}>Skip</button><button className="primary" onClick={async () => { if (input.current?.value) await capture(input.current.value, { gtdState: "inbox" }); setStep(2); }}>Capture</button></div></div>}
    {step === 2 && <div className="stack"><h2>Tomorrow first?</h2>{next[0] && <article className="suggestion"><strong>{next[0].title}</strong><p>{next[0].metadata?.first_physical_action || "Begin with this next action."}</p></article>}<input className="text-input" value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Or write my own" /><div className="modal-actions"><button className="secondary" onClick={async () => { if (custom.trim()) { const created = await capture(custom, { gtdState: "next_action" }); if (created) storage.setItem("buubo_tomorrow_start_from_id", created.id); } onDone(); }}>Write my own</button><button className="primary" disabled={!next[0]} onClick={() => { if (next[0]) storage.setItem("buubo_tomorrow_start_from_id", next[0].id); onDone(); }}>Use this</button></div></div>}
  </Modal>;
}

export default function Page() {
  const data = useThings();
  const capture = useCapture(data.setThings, data.fetchThings);
  const mode = useNightLight();
  const [activeTab, setActiveTab] = useState<Tab>("flow");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [endDay, setEndDay] = useState(false);
  const [toast, setToast] = useState("");
  const touchStart = useRef(0);
  const nextCount = useMemo(() => data.things.filter((thing) => normalizeGTDState(thing) === "next_action").length, [data.things]);
  const safeCapture = async (title: string, options: { gtdState: CanonicalGTDState; isUrgent?: boolean }) => {
    if (options.gtdState === "doing") {
      const current = data.things.find((thing) => normalizeGTDState(thing) === "doing");
      if (current) await data.updateThingState(current, "next_action");
    }
    return capture(title, options);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const complete = async (thing: Thing, proof = "") => {
    await data.updateThingState(thing, "done", { proof_text: proof });
    const key = `buubo_focus_sessions_${new Date().toISOString().slice(0, 10)}`;
    const count = Number(storage.getItem(key) || 0) + 1;
    storage.setItem(key, String(count));
    setSheet(count === 2 ? { kind: "grass" } : null);
  };

  return (
    <div className={`app-shell ${mode}`}>
      <aside className="side-nav">
        <div className="brand"><span>◉</span><strong>Buubo</strong></div>
        <nav>{TAB_ORDER.map((tab) => <button className={activeTab === tab ? "active" : ""} key={tab} onClick={() => setActiveTab(tab)}><span>{tab === "flow" ? "◎" : "≡"}</span>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</nav>
        <button className="capture-side" onClick={() => setCaptureOpen(true)}>＋ Capture</button>
        <small className={`sync-status ${data.connectionLevel}`}>● {data.statusText}</small>
      </aside>
      <main className="content" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => {
        const delta = event.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(delta) < 70) return;
        const index = TAB_ORDER.indexOf(activeTab);
        setActiveTab(TAB_ORDER[Math.max(0, Math.min(TAB_ORDER.length - 1, index + (delta < 0 ? 1 : -1)))]);
      }}>
        <header className="view-header">
          <div>
            <p className="eyebrow">{activeTab === 'flow' ? 'Desk' : 'Dump'}</p>
            <h1>{activeTab === 'flow' ? 'Flow' : 'Things'}</h1>
          </div>
          <CompactNow things={data.things} />
        </header>

        {activeTab === "flow" && <FlowDesk things={data.things} syncingId={data.syncingId} update={data.updateThingState} setSheet={setSheet} capture={safeCapture} />}
        {activeTab === "things" && <ThingsRoom things={data.things} update={data.updateThingState} capture={safeCapture} />}
      </main>
      {activeTab === "flow" && <button className="fab" aria-label="Capture" onClick={() => setCaptureOpen(true)}>＋</button>}
      <nav className="bottom-nav">{TAB_ORDER.map((tab) => <button className={activeTab === tab ? "active" : ""} key={tab} onClick={() => setActiveTab(tab)}><span>{tab === "flow" ? "◎" : "≡"}</span>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</nav>
      {captureOpen && <CaptureModal capture={safeCapture} nextCount={nextCount} onClose={() => setCaptureOpen(false)} onWip={(title) => { setCaptureOpen(false); setSheet({ kind: "wip", title }); }} />}
      {sheet?.kind === "done" && <Modal sheet onClose={() => setSheet(null)}><p className="eyebrow">Done</p><h2>What changed?</h2><form className="stack" onSubmit={(event) => { event.preventDefault(); const proof = new FormData(event.currentTarget).get("proof")?.toString() || ""; void complete(sheet.thing, proof); }}><textarea className="text-input" name="proof" autoFocus placeholder="Repo created, message sent, decision made…" /><div className="modal-actions"><button type="button" className="secondary" onClick={() => void complete(sheet.thing)}>Skip</button><button className="primary">Save & Continue</button></div></form></Modal>}
      {sheet?.kind === "drop" && <Modal sheet onClose={() => setSheet(null)}><p className="eyebrow">Drop</p><h2>Dropping: {sheet.thing.title}. Why?</h2><div className="choice-list">{DROP_REASONS.map((reason) => <button key={reason} onClick={() => { void data.updateThingState(sheet.thing, "dropped", { drop_reason: reason }); setSheet(null); }}>{REASON_LABELS[reason]}</button>)}</div></Modal>}
      {sheet?.kind === "stuck" && <StuckModal thing={sheet.thing} capture={safeCapture} update={data.updateThingState} close={() => setSheet(null)} toast={setToast} />}
      {sheet?.kind === "wip" && <Modal onClose={() => setSheet(null)}><p className="eyebrow">Limit</p><h2>3 Next Actions max.</h2><p>Park one first.</p><div className="modal-actions"><button className="secondary" onClick={() => { setSheet(null); setActiveTab("flow"); }}>Park one first</button><button className="primary" onClick={() => { void capture(sheet.title, { gtdState: "next_action" }); setSheet(null); }}>Add anyway</button></div></Modal>}
      {sheet?.kind === "grass" && <Modal onClose={() => setSheet(null)}><div className="grass">🌿</div><h2>Step away. 5 minutes.</h2><p>Drink water. Stretch. Look outside.<br />Same action when you&apos;re back.</p><div className="modal-actions"><button className="secondary" onClick={() => setSheet(null)}>Skip</button><button className="primary" onClick={() => setSheet(null)}>I&apos;m back</button></div></Modal>}
      {endDay && <EndDayRitual things={data.things} capture={safeCapture} update={data.updateThingState} onClose={() => setEndDay(false)} onDone={() => { setEndDay(false); setToast("Held. Rest now."); }} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function StuckModal({ thing, capture, update, close, toast }: {
  thing: Thing;
  capture: (title: string, options: { gtdState: CanonicalGTDState; isUrgent?: boolean }) => Promise<Thing | null>;
  update: ReturnType<typeof useThings>["updateThingState"];
  close: () => void;
  toast: (message: string) => void;
}) {
  const [small, setSmall] = useState(false);
  const prompt = generateAiPrompt(thing);
  if (small) return <Modal sheet onClose={close}><p className="eyebrow">Make it smaller</p><h2>What&apos;s one small piece you can finish right now?</h2><form className="stack" onSubmit={async (event) => { event.preventDefault(); const title = new FormData(event.currentTarget).get("title")?.toString() || ""; await update(thing, "inbox", { stuck_exit: "make_smaller" }); await capture(title, { gtdState: "doing" }); close(); }}><input className="text-input" autoFocus name="title" required /><button className="primary">Start this piece</button></form></Modal>;
  return <Modal sheet onClose={close}><p className="eyebrow">Stuck</p><h2>{thing.title}</h2><div className="choice-list">
    <button onClick={() => setSmall(true)}>✂ <span><strong>Make it smaller</strong><small>Find one finishable piece</small></span></button>
    <button onClick={async () => { await navigator.clipboard.writeText(prompt); await update(thing, "waiting", { stuck_exit: "prompt_ai", ai_prompt_text: prompt }); toast("Prompt copied. Moved to Waiting."); close(); }}>📋 <span><strong>Ask AI (copy prompt)</strong><small>Move to Waiting after copy</small></span></button>
    <button onClick={() => { void update(thing, "doing", { stuck_exit: "ugly_draft", first_physical_action: "Write any version, ugly is ok" }); close(); }}>✏ <span><strong>Write ugly first draft</strong><small>Permission to make it imperfect</small></span></button>
    <button onClick={() => { void update(thing, "doing", { stuck_exit: "five_minutes" }); toast("5-minute mode active"); close(); }}>⏱ <span><strong>Do 5 minutes only</strong><small>A small commitment</small></span></button>

  </div></Modal>;
}
