import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface EditableFieldProps {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  /** Classes applied in BOTH read and edit states (typography, color). */
  className?: string;
  /** Extra classes for the read-state container only. */
  readClassName?: string;
  ariaLabel?: string;
  /** When true, an empty value renders nothing until hovered (ghost affordance). */
  hideWhenEmpty?: boolean;
}

/**
 * Notion-style inline editor. At rest it is indistinguishable from static text;
 * clicking turns it into a borderless input with a soft focus ring. Commits on
 * blur or Enter (single-line), cancels on Escape.
 */
export default function EditableField({
  value,
  onCommit,
  placeholder = "Empty",
  multiline = false,
  className,
  readClassName,
  ariaLabel,
  hideWhenEmpty = false,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRef = useRef<any>(null);

  // Keep the draft in sync when the underlying value changes externally.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useLayoutEffect(() => {
    if (editing && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      if (multiline) {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }
    }
  }, [editing, multiline]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value.trim()) onCommit(trimmed);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    const isEmpty = value.trim().length === 0;
    if (isEmpty && hideWhenEmpty) {
      return (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "inline-flex items-center rounded-md border border-dashed border-stone-200 px-1.5 py-0.5 text-[11px] leading-none text-stone-400 hover:text-amber-600 hover:border-amber-300 transition-colors text-left",
            readClassName
          )}
          aria-label={ariaLabel}
        >
          {placeholder}
        </button>
      );
    }
    return (
      <div
        role="textbox"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onFocus={() => setEditing(true)}
        className={cn(
          "cursor-text rounded-md px-1 -mx-1 hover:bg-stone-100/70 transition-colors",
          className,
          readClassName
        )}
        aria-label={ariaLabel}
      >
        {isEmpty ? (
          <span className="italic text-stone-400">{placeholder}</span>
        ) : (
          value
        )}
      </div>
    );
  }

  const baseClass = cn(
    "w-full bg-white rounded-md px-1 -mx-1 outline-none ring-2 ring-amber-500/30 border border-amber-500/30",
    className
  );

  const commonEventProps = {
    "aria-label": ariaLabel,
    onBlur: commit,
    onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
      if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        commit();
      }
    },
  };

  return multiline ? (
    <textarea
      ref={inputRef}
      value={draft}
      rows={1}
      onChange={(e) => {
        setDraft(e.target.value);
        if (inputRef.current) {
          inputRef.current.style.height = "auto";
          inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
      }}
      className={cn(baseClass, "resize-none block")}
      {...commonEventProps}
    />
  ) : (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      className={baseClass}
      {...commonEventProps}
    />
  );
}
