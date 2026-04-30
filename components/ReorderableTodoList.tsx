"use client";

import { useState, useRef } from "react";
import { GripVertical } from "lucide-react";
import { Todo } from "@/lib/types";
import TodoItem from "./TodoItem";

interface Props {
  todos: Todo[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  onReorder: (reordered: Todo[]) => void;
}

export default function ReorderableTodoList({ todos, onToggle, onDelete, onUpdate, onReorder }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  function handleDragStart(e: React.DragEvent, index: number, id: string) {
    dragItem.current = index;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnter(index: number, id: string) {
    dragOverItem.current = index;
    setOverId(id);
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      setDraggingId(null);
      setOverId(null);
      return;
    }
    const reordered = [...todos];
    const dragged = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragOverItem.current, 0, dragged);
    onReorder(reordered);
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingId(null);
    setOverId(null);
  }

  return (
    <div className="space-y-2">
      {todos.map((todo, index) => (
        <div
          key={todo.id}
          draggable
          onDragStart={e => handleDragStart(e, index, todo.id)}
          onDragEnter={() => handleDragEnter(index, todo.id)}
          onDragEnd={handleDragEnd}
          onDragOver={e => e.preventDefault()}
          style={{
            opacity: draggingId === todo.id ? 0.4 : 1,
            transform: overId === todo.id && draggingId !== todo.id ? "translateY(-2px)" : "none",
            transition: "transform 0.15s ease, opacity 0.15s ease",
            borderTop: overId === todo.id && draggingId !== todo.id ? "2px solid var(--accent)" : "2px solid transparent",
          }}
        >
          <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
            {/* Drag handle */}
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 24, flexShrink: 0, cursor: "grab",
                color: "var(--border)", borderRadius: "10px 0 0 10px",
                background: "var(--card)", border: "1px solid var(--border)", borderRight: "none",
              }}
              title="Drag to reorder"
            >
              <GripVertical size={14} />
            </div>
            <div style={{ flex: 1 }}>
              <TodoItem todo={todo} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
