"use client";

import { useState } from "react";
import { Plus, Trash2, Pin, X, Search, ArrowLeft, Edit3 } from "lucide-react";
import { Note } from "@/lib/types";

interface Props {
  notes: Note[];
  onAdd: (note: { title: string; content: string; color: string; pinned: boolean }) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Note>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const NOTE_COLORS: { key: string; bg: string; border: string; dot: string; headerBg: string }[] = [
  { key: "default", bg: "#0a0a0f",             border: "#2a2a3a",                    dot: "#6b6b8a", headerBg: "#111118" },
  { key: "gold",    bg: "rgba(232,197,71,0.06)", border: "rgba(232,197,71,0.2)",      dot: "#e8c547", headerBg: "rgba(232,197,71,0.1)" },
  { key: "green",   bg: "rgba(46,213,115,0.06)", border: "rgba(46,213,115,0.2)",      dot: "#2ed573", headerBg: "rgba(46,213,115,0.1)" },
  { key: "red",     bg: "rgba(255,71,87,0.06)",  border: "rgba(255,71,87,0.2)",       dot: "#ff4757", headerBg: "rgba(255,71,87,0.1)" },
  { key: "purple",  bg: "rgba(139,92,246,0.06)", border: "rgba(139,92,246,0.2)",      dot: "#a78bfa", headerBg: "rgba(139,92,246,0.1)" },
  { key: "blue",    bg: "rgba(30,144,255,0.06)", border: "rgba(30,144,255,0.2)",      dot: "#4d9fff", headerBg: "rgba(30,144,255,0.1)" },
];

function getColor(key: string) { return NOTE_COLORS.find(c => c.key === key) || NOTE_COLORS[0]; }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2">
      {NOTE_COLORS.map(c => (
        <button key={c.key} onClick={() => onChange(c.key)}
          className="w-5 h-5 rounded-full transition-all hover:scale-110"
          style={{ background: c.dot, boxShadow: value === c.key ? `0 0 0 2px #fff, 0 0 0 3px ${c.dot}` : "none" }} />
      ))}
    </div>
  );
}

export default function Notes({ notes, onAdd, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [openNote, setOpenNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editColor, setEditColor] = useState("default");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState("default");

  const filtered = notes
    .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  async function handleCreate() {
    if (!newTitle.trim() && !newContent.trim()) return;
    await onAdd({ title: newTitle.trim() || "Untitled", content: newContent, color: newColor, pinned: false });
    setNewTitle(""); setNewContent(""); setNewColor("default"); setCreating(false);
  }

  function openNoteView(note: Note) {
    setOpenNote(note);
    setIsEditing(false);
  }

  function startEdit() {
    if (!openNote) return;
    setEditTitle(openNote.title);
    setEditContent(openNote.content);
    setEditColor(openNote.color);
    setIsEditing(true);
  }

  async function saveEdit() {
    if (!openNote) return;
    const updates = { title: editTitle.trim() || "Untitled", content: editContent, color: editColor };
    await onUpdate(openNote.id, updates);
    setOpenNote({ ...openNote, ...updates });
    setIsEditing(false);
  }

  async function handleDelete(id: string) {
    await onDelete(id);
    setOpenNote(null);
  }

  // ── FULL VIEW MODE ──
  if (openNote) {
    const c = getColor(isEditing ? editColor : openNote.color);
    return (
      <div className="pb-20 animate-fade-in" style={{ minHeight: "70vh" }}>
        {/* Note header bar */}
        <div className="flex items-center justify-between mb-4 py-2 sticky top-0"
          style={{ background: "rgba(10,10,15,0.9)", backdropFilter: "blur(12px)", zIndex: 20, borderBottom: `1px solid ${c.border}`, margin: "0 -1rem", padding: "0.75rem 1rem" }}>
          <button onClick={() => { setOpenNote(null); setIsEditing(false); }}
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--muted)" }}>
            <ArrowLeft size={16} /> All Notes
          </button>
          <div className="flex items-center gap-2">
            {isEditing && <ColorPicker value={editColor} onChange={setEditColor} />}
            {!isEditing ? (
              <>
                <button onClick={() => onUpdate(openNote.id, { pinned: !openNote.pinned }).then(() => setOpenNote({ ...openNote, pinned: !openNote.pinned }))}
                  className="p-2 rounded-lg hover:bg-white/5"
                  style={{ color: openNote.pinned ? "var(--accent)" : "var(--muted)" }}>
                  <Pin size={15} />
                </button>
                <button onClick={startEdit} className="p-2 rounded-lg hover:bg-white/5" style={{ color: "var(--muted)" }}>
                  <Edit3 size={15} />
                </button>
                <button onClick={() => handleDelete(openNote.id)} className="p-2 rounded-lg hover:bg-red-500/10" style={{ color: "var(--muted)" }}>
                  <Trash2 size={15} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(false)} className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
                <button onClick={saveEdit} className="btn-primary text-xs py-1.5 px-3">Save</button>
              </>
            )}
          </div>
        </div>

        {/* Note body — full view, page scrolls naturally */}
        <div className="rounded-2xl p-6" style={{ background: c.bg, border: `1px solid ${c.border}`, minHeight: "60vh" }}>
          {isEditing ? (
            <>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full bg-transparent outline-none text-2xl font-bold mb-4"
                style={{ color: "#fff", fontFamily: "'Playfair Display',serif", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}
                placeholder="Note title..."
                autoFocus
              />
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full bg-transparent outline-none resize-none text-base leading-relaxed"
                style={{ color: "var(--soft)", fontFamily: "'DM Sans',sans-serif", minHeight: "50vh" }}
                placeholder="Start writing..."
              />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-4" style={{ color: "#fff", fontFamily: "'Playfair Display',serif", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
                {openNote.title}
              </h1>
              {openNote.content ? (
                <div className="text-base leading-relaxed" style={{ color: "var(--soft)", fontFamily: "'DM Sans',sans-serif", whiteSpace: "pre-wrap" }}>
                  {openNote.content}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--border)" }}>Empty note — click ✏️ to edit</p>
              )}
              <p className="text-xs mt-8" style={{ color: "var(--border)" }}>Last edited {timeAgo(openNote.updated_at)}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── NOTES LIST ──
  return (
    <div className="pb-20 animate-fade-in">
      {/* Search + New */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="input-field text-sm" style={{ paddingLeft: "2.25rem", paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
            placeholder="Search notes..." />
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-1.5 text-sm px-3">
          <Plus size={14} /> New
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-xl p-4 mb-4 animate-slide-down" style={{ background: getColor(newColor).bg, border: `1px solid ${getColor(newColor).border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="flex-1 bg-transparent outline-none text-base font-semibold"
              style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}
              placeholder="Note title..." autoFocus
              onKeyDown={e => { if (e.key === "Escape") setCreating(false); }} />
            <button onClick={() => setCreating(false)} style={{ color: "var(--muted)" }}><X size={16} /></button>
          </div>
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
            className="w-full bg-transparent outline-none resize-none text-sm leading-relaxed mb-3"
            style={{ color: "var(--soft)", fontFamily: "'DM Sans',sans-serif", minHeight: 80 }}
            placeholder="Start typing..." />
          <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <ColorPicker value={newColor} onChange={setNewColor} />
            <button onClick={handleCreate} className="btn-primary text-xs py-1.5 px-4" disabled={!newTitle.trim() && !newContent.trim()}>
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Notes grid */}
      {filtered.length === 0 && !creating ? (
        <div className="text-center py-16 rounded-xl" style={{ background: "rgba(26,26,36,0.6)", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: "2rem" }}>📝</p>
          <p className="mt-2 font-medium" style={{ color: "var(--soft)" }}>{search ? "No notes match" : "No notes yet"}</p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Tap "New" to create one</p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))" }}>
          {filtered.map(note => {
            const c = getColor(note.color);
            return (
              <div key={note.id}
                onClick={() => openNoteView(note)}
                className="rounded-xl p-4 cursor-pointer group relative"
                style={{ background: c.bg, border: `1px solid ${c.border}`, transition: "transform 0.15s, box-shadow 0.15s", minHeight: 120 }}>

                {/* Actions — stop propagation */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => onUpdate(note.id, { pinned: !note.pinned })}
                    className="p-1.5 rounded-lg hover:bg-white/10"
                    style={{ color: note.pinned ? "var(--accent)" : "var(--muted)" }}>
                    <Pin size={12} />
                  </button>
                  <button onClick={() => handleDelete(note.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: "var(--muted)" }}>
                    <Trash2 size={12} />
                  </button>
                </div>

                {note.pinned && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", marginBottom: 8 }} />}

                <h3 className="text-sm font-semibold mb-2 pr-12" style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}>
                  {note.title}
                </h3>
                {note.content && (
                  <p className="text-xs leading-relaxed" style={{ color: "var(--muted)", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-wrap" }}>
                    {note.content}
                  </p>
                )}
                <p className="text-xs mt-3" style={{ color: "var(--border)" }}>{timeAgo(note.updated_at)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
