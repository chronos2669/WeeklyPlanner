import { useState, useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_COLORS = [
  { accent: "#6C9BF2", bg: "rgba(108,155,242,0.06)", border: "rgba(108,155,242,0.15)" },
  { accent: "#A78BFA", bg: "rgba(167,139,250,0.06)", border: "rgba(167,139,250,0.15)" },
  { accent: "#F472B6", bg: "rgba(244,114,182,0.06)", border: "rgba(244,114,182,0.15)" },
  { accent: "#FB923C", bg: "rgba(251,146,60,0.06)", border: "rgba(251,146,60,0.15)" },
  { accent: "#FBBF24", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.15)" },
  { accent: "#34D399", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.15)" },
  { accent: "#38BDF8", bg: "rgba(56,189,248,0.06)", border: "rgba(56,189,248,0.15)" },
];

const STORAGE_KEY_TASKS = "weekly-planner:tasks-v1";
const STORAGE_KEY_GOALS = "weekly-planner:goals-v1";

let idCounter = 1;
const uid = () => `t${idCounter++}`;

/* ── Walk tasks (and nested children) to find highest numeric ID suffix ── */
function findMaxId(tasks) {
  let max = 0;
  const walk = (list) => {
    for (const t of list) {
      const m = /^t(\d+)$/.exec(t.id || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
      if (t.children && t.children.length) walk(t.children);
    }
  };
  walk(tasks);
  return max;
}

/* ── Load + validate from localStorage ── */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Shape check: must be object with every day key as array
    if (!parsed || typeof parsed !== "object") return null;
    const result = {};
    for (const d of DAYS) {
      result[d] = Array.isArray(parsed[d]) ? parsed[d] : [];
    }
    return result;
  } catch {
    return null;
  }
}
function loadGoals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GOALS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/* ── Subtask (no checkbox, just a bullet) ── */
function SubtaskItem({ task, depth, onDelete, onAddChild, accentColor }) {
  const [childInput, setChildInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (showAdd && inputRef.current) inputRef.current.focus(); }, [showAdd]);

  const submitChild = () => {
    const v = childInput.trim();
    if (v) { onAddChild(task.id, v); setChildInput(""); setShowAdd(false); }
  };

  return (
    <div style={{ marginLeft: depth * 18 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
        borderBottom: "1px solid rgba(255,255,255,0.02)",
      }}>
        <span style={{
          width: 14, textAlign: "center", flexShrink: 0,
          color: accentColor, fontSize: 11, opacity: 0.5, fontWeight: 700,
        }}>–</span>
        <span style={{
          flex: 1, fontSize: 12.5, color: "rgba(255,255,255,0.55)",
          fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.01em",
        }}>{task.text}</span>
        <button onClick={() => setShowAdd(!showAdd)} title="Add subtask" style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer",
          fontSize: 16, padding: "0 4px", lineHeight: 1, transition: "color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = accentColor}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
        <button onClick={() => onDelete(task.id)} title="Remove" style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.1)", cursor: "pointer",
          fontSize: 13, padding: "0 2px", lineHeight: 1, transition: "color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.1)"}
        >✕</button>
      </div>
      {showAdd && (
        <div style={{ display: "flex", gap: 6, marginLeft: 22, padding: "4px 0" }}>
          <input ref={inputRef} value={childInput} onChange={e => setChildInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submitChild()}
            placeholder="Subtask..."
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "4px 10px", color: "#fff", fontSize: 12,
              fontFamily: "'DM Sans', sans-serif", outline: "none",
            }}
          />
          <button onClick={submitChild} style={{
            background: accentColor, border: "none", borderRadius: 8, padding: "4px 10px",
            color: "#111", fontWeight: 600, fontSize: 11, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Add</button>
        </div>
      )}
      {task.children && task.children.map(child => (
        <SubtaskItem key={child.id} task={child} depth={depth + 1}
          onDelete={onDelete} onAddChild={onAddChild} accentColor={accentColor}/>
      ))}
    </div>
  );
}

/* ── Drag handle grip icon ── */
function GripHandle({ visible, accentColor, ...props }) {
  return (
    <div {...props} style={{
      cursor: "grab", padding: "0 2px", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 2,
      opacity: visible ? 0.5 : 0, transition: "opacity 0.15s ease",
      color: accentColor, flexShrink: 0, ...(props.style || {}),
    }}>
      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
        <circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/>
        <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
        <circle cx="3" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/>
      </svg>
    </div>
  );
}

/* ── Parent task row (with checkbox + drag) ── */
function ParentTaskItem({ task, index, onToggle, onDelete, onAddChild, accentColor,
  onDragStart, onDragOver, onDragEnd, isDragging, isOver }) {
  const [childInput, setChildInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (showAdd && inputRef.current) inputRef.current.focus(); }, [showAdd]);

  const submitChild = () => {
    const v = childInput.trim();
    if (v) { onAddChild(task.id, v); setChildInput(""); setShowAdd(false); }
  };

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(index); }}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10, padding: "1px 0",
        opacity: isDragging ? 0.35 : 1,
        background: isOver ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "background 0.15s, opacity 0.15s",
        borderTop: isOver ? `2px solid ${accentColor}` : "2px solid transparent",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "6px 0",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
      }}>
        <GripHandle visible={hovered} accentColor={accentColor} />
        <button onClick={() => onToggle(task.id)} style={{
          width: 18, height: 18, borderRadius: 5,
          border: `1.5px solid ${task.done ? accentColor : "rgba(255,255,255,0.2)"}`,
          background: task.done ? accentColor : "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          transition: "all 0.2s ease",
        }}>
          {task.done && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.5L5 9L10 3" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <span style={{
          flex: 1, fontSize: 13.5,
          color: task.done ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.82)",
          textDecoration: task.done ? "line-through" : "none",
          fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease", letterSpacing: "0.01em",
        }}>{task.text}</span>
        <button onClick={() => setShowAdd(!showAdd)} title="Add subtask" style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer",
          fontSize: 16, padding: "0 4px", lineHeight: 1, transition: "color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = accentColor}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
        <button onClick={() => onDelete(task.id)} title="Remove" style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer",
          fontSize: 14, padding: "0 2px", lineHeight: 1, transition: "color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}
        >✕</button>
      </div>

      {showAdd && (
        <div style={{ display: "flex", gap: 6, marginLeft: 32, padding: "5px 0" }}>
          <input ref={inputRef} value={childInput} onChange={e => setChildInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submitChild()}
            placeholder="Subtask..."
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "5px 10px", color: "#fff", fontSize: 12.5,
              fontFamily: "'DM Sans', sans-serif", outline: "none",
            }}
          />
          <button onClick={submitChild} style={{
            background: accentColor, border: "none", borderRadius: 8, padding: "4px 10px",
            color: "#111", fontWeight: 600, fontSize: 11, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Add</button>
        </div>
      )}

      {task.children && task.children.length > 0 && (
        <div style={{ marginLeft: 16, paddingBottom: 2 }}>
          {task.children.map(child => (
            <SubtaskItem key={child.id} task={child} depth={0}
              onDelete={onDelete} onAddChild={onAddChild} accentColor={accentColor}/>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Day card ── */
function DayCard({ day, index, tasks, onAdd, onToggle, onDelete, onAddChild, onReorder }) {
  const [input, setInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef(null);
  const col = DAY_COLORS[index];

  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  useEffect(() => { if (showInput && inputRef.current) inputRef.current.focus(); }, [showInput]);

  const submit = () => {
    const v = input.trim();
    if (v) { onAdd(day, v); setInput(""); setShowInput(false); }
  };

  const handleDragEnd = () => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      onReorder(day, dragIdx, overIdx);
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;

  return (
    <div style={{
      background: col.bg, border: `1px solid ${col.border}`, borderRadius: 18,
      padding: 18, display: "flex", flexDirection: "column", gap: 6,
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      minHeight: 120,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 30px ${col.border}`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.accent }}/>
          <span style={{
            fontSize: 14, fontWeight: 700, color: col.accent,
            fontFamily: "'Sora', sans-serif", letterSpacing: "0.04em", textTransform: "uppercase",
          }}>{day}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {totalTasks > 0 && (
            <span style={{
              fontSize: 10.5, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif",
              background: "rgba(255,255,255,0.05)", padding: "2px 7px", borderRadius: 6,
            }}>{doneTasks}/{totalTasks}</span>
          )}
          <button onClick={() => setShowInput(!showInput)} style={{
            width: 26, height: 26, borderRadius: 8, border: `1.5px solid ${col.border}`,
            background: showInput ? col.accent : "rgba(255,255,255,0.03)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s ease", color: showInput ? "#111" : col.accent,
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {totalTasks > 0 && (
        <div style={{
          height: 2, borderRadius: 2, background: "rgba(255,255,255,0.05)", marginBottom: 4, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${(doneTasks / totalTasks) * 100}%`,
            background: col.accent, borderRadius: 2, transition: "width 0.4s ease",
          }}/>
        </div>
      )}

      {showInput && (
        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="New task..."
            style={{
              flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "7px 12px", color: "#fff", fontSize: 13,
              fontFamily: "'DM Sans', sans-serif", outline: "none",
            }}
            onFocus={e => e.target.style.borderColor = col.accent}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
          />
          <button onClick={submit} style={{
            background: col.accent, border: "none", borderRadius: 10, padding: "6px 14px",
            color: "#111", fontWeight: 700, fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Add</button>
        </div>
      )}

      <div style={{ flex: 1 }}>
        {tasks.length === 0 && !showInput && (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", fontStyle: "italic", margin: "8px 0",
            fontFamily: "'DM Sans', sans-serif" }}>No tasks yet</p>
        )}
        {tasks.map((t, i) => (
          <ParentTaskItem key={t.id} task={t} index={i}
            onToggle={(id) => onToggle(day, id)} onDelete={(id) => onDelete(day, id)}
            onAddChild={(pid, text) => onAddChild(day, pid, text)} accentColor={col.accent}
            onDragStart={setDragIdx} onDragOver={setOverIdx} onDragEnd={handleDragEnd}
            isDragging={dragIdx === i} isOver={overIdx === i && dragIdx !== i}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Helpers for nested child operations ── */
function deleteInList(tasks, id) {
  return tasks.filter(t => t.id !== id).map(t =>
    t.children ? { ...t, children: deleteInList(t.children, id) } : t
  );
}
function addChildInList(tasks, parentId, text) {
  return tasks.map(t => {
    if (t.id === parentId) return { ...t, children: [...(t.children || []), { id: uid(), text, children: [] }] };
    if (t.children) return { ...t, children: addChildInList(t.children, parentId, text) };
    return t;
  });
}

/* ── Safe text escape for HTML injection (export only) ── */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function subtaskHTML(task, depth, accent) {
  const indent = depth * 14;
  let html = `<div style="margin-left:${indent}px;display:flex;align-items:center;gap:6px;padding:3px 0;">
    <span style="width:10px;text-align:center;color:${accent};font-size:10px;opacity:0.55;font-weight:700;flex-shrink:0;">–</span>
    <span style="font-size:10.5px;color:rgba(255,255,255,0.55);letter-spacing:0.01em;">${esc(task.text)}</span>
  </div>`;
  if (task.children) {
    for (const c of task.children) html += subtaskHTML(c, depth + 1, accent);
  }
  return html;
}

function buildExportHTML(tasksByDay, goals, days, colors) {
  const totalAll = days.reduce((s, d) => s + tasksByDay[d].length, 0);
  const doneAll = days.reduce((s, d) => s + tasksByDay[d].filter(t => t.done).length, 0);
  const pct = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;
  const dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  let html = `<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:22px;">
    <div>
      <svg width="340" height="42" viewBox="0 0 340 42" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        <defs>
          <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6C9BF2"/>
            <stop offset="50%" stop-color="#A78BFA"/>
            <stop offset="100%" stop-color="#F472B6"/>
          </linearGradient>
        </defs>
        <text x="0" y="32" font-family="Sora, 'DM Sans', sans-serif" font-size="32" font-weight="800" letter-spacing="-0.96" fill="url(#titleGrad)">Weekly Planner</text>
      </svg>
      <div style="color:rgba(255,255,255,0.35);font-size:11px;margin-top:4px;letter-spacing:0.04em;text-transform:uppercase;">${esc(dateStr)}</div>
    </div>
    ${totalAll > 0 ? `<div style="display:flex;align-items:center;gap:10px;">
      <div style="width:160px;height:5px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#6C9BF2,#A78BFA);border-radius:4px;"></div>
      </div>
      <span style="font-size:12px;color:rgba(255,255,255,0.4);font-weight:600;">${doneAll}/${totalAll} done</span>
    </div>` : ""}
  </div>`;

  const goalsHTML = goals.length === 0 ? `<span style="font-size:11px;color:rgba(255,255,255,0.2);font-style:italic;">No goals set for this week</span>` :
    goals.map(g => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
      <div style="width:14px;height:14px;border-radius:4px;border:1.5px solid ${g.done ? "#FBBF24" : "rgba(255,255,255,0.2)"};
        background:${g.done ? "#FBBF24" : "transparent"};flex-shrink:0;display:flex;align-items:center;justify-content:center;">
        ${g.done ? `<svg width="8" height="8" viewBox="0 0 12 12"><path d="M2.5 6.5L5 9L10 3" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>` : ""}
      </div>
      <span style="font-size:11.5px;font-weight:500;color:${g.done ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.82)"};${g.done ? "text-decoration:line-through;" : ""}">★ ${esc(g.text)}</span>
    </div>`).join("");

  html += `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:12px 18px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:${goals.length ? 8 : 0}px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#FBBF24" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="5" stroke="#FBBF24" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="1.5" fill="#FBBF24"/>
      </svg>
      <span style="font-family:'Sora',sans-serif;font-weight:700;font-size:11px;color:#FBBF24;letter-spacing:0.08em;text-transform:uppercase;">Weekly Goals</span>
    </div>
    ${goalsHTML}
  </div>`;

  html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;flex:1;min-height:0;">`;
  days.forEach((day, i) => {
    const col = colors[i];
    const tasks = tasksByDay[day];
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const dpct = total > 0 ? (done / total) * 100 : 0;

    let tasksHTML = "";
    if (tasks.length === 0) {
      tasksHTML = `<div style="font-size:10px;color:rgba(255,255,255,0.15);font-style:italic;margin-top:6px;">No tasks</div>`;
    } else {
      tasksHTML = tasks.map(t => {
        let tHtml = `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
          <div style="display:flex;align-items:flex-start;gap:5px;">
            <div style="width:13px;height:13px;border-radius:4px;margin-top:2px;flex-shrink:0;
              border:1.5px solid ${t.done ? col.accent : "rgba(255,255,255,0.2)"};
              background:${t.done ? col.accent : "transparent"};display:flex;align-items:center;justify-content:center;">
              ${t.done ? `<svg width="7" height="7" viewBox="0 0 12 12"><path d="M2.5 6.5L5 9L10 3" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>` : ""}
            </div>
            <span style="flex:1;font-size:10.5px;line-height:1.35;color:${t.done ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.85)"};${t.done ? "text-decoration:line-through;" : ""}letter-spacing:0.01em;">${esc(t.text)}</span>
          </div>`;
        if (t.children && t.children.length > 0) {
          tHtml += `<div style="margin-left:18px;margin-top:2px;">`;
          for (const c of t.children) tHtml += subtaskHTML(c, 0, col.accent);
          tHtml += `</div>`;
        }
        tHtml += `</div>`;
        return tHtml;
      }).join("");
    }

    html += `<div style="background:${col.bg};border:1px solid ${col.border};border-radius:14px;padding:12px;
      display:flex;flex-direction:column;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:6px;height:6px;border-radius:50%;background:${col.accent};"></div>
          <span style="font-family:'Sora',sans-serif;font-size:10.5px;font-weight:700;color:${col.accent};letter-spacing:0.06em;text-transform:uppercase;">${day}</span>
        </div>
        ${total > 0 ? `<span style="font-size:9px;color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:4px;">${done}/${total}</span>` : ""}
      </div>
      ${total > 0 ? `<div style="height:2px;border-radius:2px;background:rgba(255,255,255,0.05);margin-bottom:6px;overflow:hidden;">
        <div style="height:100%;width:${dpct}%;background:${col.accent};border-radius:2px;"></div>
      </div>` : ""}
      <div style="flex:1;overflow:hidden;">${tasksHTML}</div>
    </div>`;
  });
  html += `</div>`;

  html += `<div style="margin-top:14px;text-align:center;color:rgba(255,255,255,0.2);font-size:9px;letter-spacing:0.04em;">
    Generated ${esc(dateStr)} · Weekly Planner
  </div>`;

  return html;
}

async function exportAsPNG(tasksByDay, goals, days, colors) {
  const W = 1697, H = 1200;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:fixed;top:0;left:-99999px;width:${W}px;height:${H}px;
    background:#0C0E14;color:#fff;font-family:'DM Sans',sans-serif;padding:30px 34px;
    box-sizing:border-box;display:flex;flex-direction:column;`;
  wrapper.innerHTML = buildExportHTML(tasksByDay, goals, days, colors);
  document.body.appendChild(wrapper);

  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch {}

  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: "#0C0E14",
      scale: 2,
      width: W,
      height: H,
      useCORS: true,
    });
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `weekly-planner-${today}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    document.body.removeChild(wrapper);
  }
}

/* ── Main planner ── */
export default function WeeklyPlanner() {
  // Initialize state from localStorage (runs once on mount)
  const [tasksByDay, setTasksByDay] = useState(() => {
    const loaded = loadTasks();
    if (loaded) {
      // Seed idCounter so new IDs don't collide with loaded ones
      const max = Math.max(
        ...DAYS.map(d => findMaxId(loaded[d])),
        0
      );
      idCounter = max + 1;
      return loaded;
    }
    const m = {};
    DAYS.forEach(d => m[d] = []);
    return m;
  });
  const [goals, setGoals] = useState(() => {
    const loaded = loadGoals();
    if (loaded) {
      const max = findMaxId(loaded);
      if (max >= idCounter) idCounter = max + 1;
      return loaded;
    }
    return [];
  });
  const [goalInput, setGoalInput] = useState("");
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [exporting, setExporting] = useState(false);
  const goalRef = useRef(null);

  // Persist tasks to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasksByDay));
    } catch (e) {
      console.warn("Failed to save tasks:", e);
    }
  }, [tasksByDay]);

  // Persist goals to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(goals));
    } catch (e) {
      console.warn("Failed to save goals:", e);
    }
  }, [goals]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportAsPNG(tasksByDay, goals, DAYS, DAY_COLORS);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Couldn't export PNG. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => { if (showGoalInput && goalRef.current) goalRef.current.focus(); }, [showGoalInput]);

  const addTask = (day, text) => {
    setTasksByDay(prev => ({ ...prev, [day]: [...prev[day], { id: uid(), text, done: false, children: [] }] }));
  };
  const toggleTask = (day, id) => {
    setTasksByDay(prev => ({
      ...prev,
      [day]: prev[day].map(t => t.id === id ? { ...t, done: !t.done } : t),
    }));
  };
  const deleteTask = (day, id) => {
    setTasksByDay(prev => ({ ...prev, [day]: deleteInList(prev[day], id) }));
  };
  const addChildTask = (day, parentId, text) => {
    setTasksByDay(prev => ({ ...prev, [day]: addChildInList(prev[day], parentId, text) }));
  };
  const reorderTasks = useCallback((day, fromIdx, toIdx) => {
    setTasksByDay(prev => {
      const arr = [...prev[day]];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return { ...prev, [day]: arr };
    });
  }, []);

  const addGoal = () => {
    const v = goalInput.trim();
    if (v) { setGoals(prev => [...prev, { id: uid(), text: v, done: false }]); setGoalInput(""); setShowGoalInput(false); }
  };
  const toggleGoal = (id) => setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  const deleteGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  const totalAll = DAYS.reduce((s, d) => s + tasksByDay[d].length, 0);
  const doneAll = DAYS.reduce((s, d) => s + tasksByDay[d].filter(t => t.done).length, 0);

  return (
    <div style={{
      minHeight: "100vh", background: "#0C0E14",
      fontFamily: "'DM Sans', sans-serif", color: "#fff", padding: "32px 24px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ maxWidth: 1200, margin: "0 auto 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{
            fontFamily: "'Sora', sans-serif", fontSize: 30, fontWeight: 800,
            margin: 0, letterSpacing: "-0.03em",
            background: "linear-gradient(135deg, #6C9BF2, #A78BFA, #F472B6)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Weekly Planner</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {totalAll > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 120, height: 5, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${(doneAll / totalAll) * 100}%`,
                  background: "linear-gradient(90deg, #6C9BF2, #A78BFA)", borderRadius: 4, transition: "width 0.4s ease",
                }}/>
              </div>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                {doneAll}/{totalAll} done
              </span>
            </div>
          )}
          <button onClick={handleExport} disabled={exporting} style={{
            display: "flex", alignItems: "center", gap: 7,
            background: exporting ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10, padding: "8px 14px",
            color: exporting ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)",
            fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
            cursor: exporting ? "wait" : "pointer", letterSpacing: "0.02em",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => { if (!exporting) { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; } }}
          onMouseLeave={e => { if (!exporting) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; } }}
          title="Export as landscape A4 PNG"
          >
            {exporting ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.9s linear infinite" }}>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="14 40" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {exporting ? "Exporting…" : "Export PNG"}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Goals */}
      <div style={{
        maxWidth: 1200, margin: "0 auto 24px",
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 18, padding: "18px 22px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: goals.length || showGoalInput ? 12 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#FBBF24" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="5" stroke="#FBBF24" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="1.5" fill="#FBBF24"/>
            </svg>
            <span style={{
              fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14,
              color: "#FBBF24", letterSpacing: "0.04em", textTransform: "uppercase",
            }}>Weekly Goals</span>
          </div>
          <button onClick={() => setShowGoalInput(!showGoalInput)} style={{
            width: 26, height: 26, borderRadius: 8, border: "1.5px solid rgba(251,191,36,0.2)",
            background: showGoalInput ? "#FBBF24" : "rgba(255,255,255,0.03)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: showGoalInput ? "#111" : "#FBBF24", transition: "all 0.2s ease",
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {showGoalInput && (
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input ref={goalRef} value={goalInput} onChange={e => setGoalInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addGoal()}
              placeholder="Set a weekly goal..."
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(251,191,36,0.15)",
                borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 13,
                fontFamily: "'DM Sans', sans-serif", outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = "#FBBF24"}
              onBlur={e => e.target.style.borderColor = "rgba(251,191,36,0.15)"}
            />
            <button onClick={addGoal} style={{
              background: "#FBBF24", border: "none", borderRadius: 10, padding: "6px 16px",
              color: "#111", fontWeight: 700, fontSize: 12, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>Add</button>
          </div>
        )}

        {goals.length === 0 && !showGoalInput && (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", fontStyle: "italic", margin: "4px 0 0" }}>
            No goals set — tap + to add one
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {goals.map(g => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
              borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <button onClick={() => toggleGoal(g.id)} style={{
                width: 18, height: 18, borderRadius: 5, cursor: "pointer",
                border: `1.5px solid ${g.done ? "#FBBF24" : "rgba(255,255,255,0.2)"}`,
                background: g.done ? "#FBBF24" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "all 0.2s",
              }}>
                {g.done && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5L5 9L10 3" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <span style={{
                flex: 1, fontSize: 13.5, fontWeight: 500,
                color: g.done ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.82)",
                textDecoration: g.done ? "line-through" : "none", transition: "all 0.2s",
              }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6, verticalAlign: "middle" }}>
                  <polygon points="8,1 10,6 16,6 11,9.5 13,15 8,11.5 3,15 5,9.5 0,6 6,6" fill="#FBBF24" opacity="0.5"/>
                </svg>
                {g.text}
              </span>
              <button onClick={() => deleteGoal(g.id)} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer",
                fontSize: 14, padding: "0 2px", transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Days Grid */}
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 14,
      }}>
        {DAYS.map((day, i) => (
          <DayCard key={day} day={day} index={i} tasks={tasksByDay[day]}
            onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask}
            onAddChild={addChildTask} onReorder={reorderTasks}/>
        ))}
      </div>

      <p style={{
        textAlign: "center", color: "rgba(255,255,255,0.1)", fontSize: 11,
        marginTop: 32, fontFamily: "'DM Sans', sans-serif",
      }}>
        Click + to add tasks · Drag the grip to reorder · Your data saves automatically
      </p>
    </div>
  );
}
