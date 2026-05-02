"use client";

import { useState } from "react";
import { Plus, Trash2, Pin, PinOff, X, Search } from "lucide-react";
import { Note } from "@/lib/types";

interface Props {
  notes: Note[];
  onAdd: (note: { title: string; content: string; color: string; pinned: boolean }) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Note>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const NOTE_COLORS: { key: string; bg: string; border: string; dot: string }[] = [
  { key: "default", bg: "rgba(26,26,36,0.9)",      border: "var(--border)",              dot: "#6b6b8a" },
  { key: "gold",    bg: "rgba(232,197,71,0.07)",    border: "rgba(232,197,71,0.25)",      dot: "#e8c547" },
  { key: "green",   bg: "rgba(46,213,115,0.07)",    border: "rgba(46,213,115,0.25)",      dot: "#2ed573" },
  { key: "red",     bg: "rgba(255,71,87,0.07)",     border: "rgba(255,71,87,0.25)",       dot: "#ff4757" },
  { key: "purple",  bg: "rgba(139,92,246,0.07)",    border: "rgba(139,92,246,0.25)",      dot: "#a78bfa" },
  { key: "blue",    bg: "rgba(30,144,255,0.07)",    border: "rgba(30,144,255,0.25)",      dot: "#4d9fff" },
];

function getColor(key: string) {
  return NOTE_COLORS.find(c => c.key === key) || NOTE_COLORS[0];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Notes({ notes, onAdd, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
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

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditColor(note.color);
  }

  async function saveEdit() {
    if (!editingId) return;
    await onUpdate(editingId, { title: editTitle.trim() || "Untitled", content: editContent, color: editColor });
    setEditingId(null);
  }

  return (
    <div className="pb-20 animate-fade-in">
      {/* Search + New */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="input-field text-sm" style={{ paddingLeft: "2.25rem", paddingTop: "0.6rem", paddingBottom: "0.6rem" }}
            placeholder="Search notes..." />
        </div>
        <button onClick={() => setCreating(true)}
          className="btn-primary flex items-center gap-1.5 text-sm px-4"
          style={{ whiteSpace: "nowrap" }}>
          <Plus size={15} /> New Note
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-xl p-4 mb-4 animate-slide-down" style={{ background: getColor(newColor).bg, border: `1px solid ${getColor(newColor).border}` }}>
          <div className="flex items-center justify-between mb-3">
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="flex-1 bg-transparent outline-none text-base font-semibold mr-3"
              style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }}
              placeholder="Note title..." autoFocus
              onKeyDown={e => e.key === "Escape" && setCreating(false)} />
            <button onClick={() => setCreating(false)} style={{ color: "var(--muted)" }}><X size={16} /></button>
          </div>
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
            className="w-full bg-transparent outline-none resize-none text-sm leading-relaxed"
            style={{ color: "var(--soft)", fontFamily: "'DM Sans',sans-serif", minHeight: 100 }}
            placeholder="Start typing your note..." />
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {/* Color picker */}
            <div className="flex gap-1.5">
              {NOTE_COLORS.map(c => (
                <button key={c.key} onClick={() => setNewColor(c.key)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                  style={{ background: c.dot, boxShadow: newColor === c.key ? `0 0 0 2px rgba(255,255,255,0.6)` : "none" }} />
              ))}
            </div>
            <button onClick={handleCreate} className="btn-primary text-xs py-1.5 px-4" disabled={!newTitle.trim() && !newContent.trim()}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Notes grid */}
      {filtered.length === 0 && !creating ? (
        <div className="text-center py-20 rounded-xl" style={{ background: "rgba(26,26,36,0.6)", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: "2.5rem" }}>📝</p>
          <p className="mt-3 font-medium" style={{ color: "var(--soft)" }}>{search ? "No notes match your search" : "No notes yet"}</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Click "New Note" to create one</p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))" }}>
          {filtered.map(note => {
            const c = getColor(note.color);
            if (editingId === note.id) {
              return (
                <div key={note.id} className="rounded-xl p-4 animate-fade-in" style={{ background: getColor(editColor).bg, border: `1px solid ${getColor(editColor).border}`, gridColumn: "1 / -1" }}>
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-transparent outline-none text-base font-semibold mb-3"
                    style={{ color: "#fff", fontFamily: "'Playfair Display',serif" }} />
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                    className="w-full bg-transparent outline-none resize-none text-sm leading-relaxed"
                    style={{ color: "var(--soft)", fontFamily: "'DM Sans',sans-serif", minHeight: 120 }} />
                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex gap-1.5">
                      {NOTE_COLORS.map(col => (
                        <button key={col.key} onClick={() => setEditColor(col.key)}
                          className="w-5 h-5 rounded-full hover:scale-110 transition-transform"
                          style={{ background: col.dot, boxShadow: editColor === col.key ? "0 0 0 2px rgba(255,255,255,0.6)" : "none" }} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="btn-ghost text-xs py-1 px-3">Cancel</button>
                      <button onClick={saveEdit} className="btn-primary text-xs py-1 px-3">Save</button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={note.id} className="rounded-xl p-4 cursor-pointer group relative"
                style={{ background: c.bg, border: `1px solid ${c.border}`, transition: "transform 0.15s, box-shadow 0.15s" }}
                onClick={() => startEdit(note)}>
                {/* Actions */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => onUpdate(note.id, { pinned: !note.pinned })}
                    className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: note.pinned ? "var(--accent)" : "var(--muted)" }}>
                    {note.pinned ? <Pin size={13} /> : <PinOff size={13} />}
                  </button>
                  <button onClick={() => onDelete(note.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: "var(--muted)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Pin indicator */}
                {note.pinned && (
                  <Pin size={10} style={{ position: "absolute", top: 10, left: 12, color: "var(--accent)", opacity: 0.6 }} />
                )}

                <h3 className="text-sm font-semibold mb-2 pr-14" style={{ color: "#fff", fontFamily: "'Playfair Display',serif", paddingLeft: note.pinned ? 16 : 0 }}>
                  {note.title}
                </h3>
                {note.content && (
                  <p className="text-xs leading-relaxed line-clamp-4" style={{ color: "var(--muted)", whiteSpace: "pre-wrap" }}>
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
