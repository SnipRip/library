"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./StudentCombobox.module.css";

export type StudentComboboxItem = {
  id: string;
  full_name: string;
  status?: string;
};

type Props = {
  students: StudentComboboxItem[];
  value: string;
  onChange: (studentId: string) => void;
  placeholder?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
};

export default function StudentCombobox({
  students,
  value,
  onChange,
  placeholder = "Search student (type name)",
  inputClassName,
  disabled,
  required,
}: Props) {
  const [query, setQuery] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const [hasEditedSinceOpen, setHasEditedSinceOpen] = useState<boolean>(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => students.find((s) => s.id === value) ?? null, [students, value]);

  const displayValue = useMemo(() => {
    if (!open && !hasEditedSinceOpen && selected) return selected.full_name;
    return query;
  }, [hasEditedSinceOpen, open, query, selected]);

  const normalizedQuery = query.trim().toLowerCase();
  const effectiveQuery = useMemo(() => {
    if (!open) return normalizedQuery;
    if (hasEditedSinceOpen) return normalizedQuery;
    if (selected && query === selected.full_name) return "";
    return normalizedQuery;
  }, [hasEditedSinceOpen, normalizedQuery, open, query, selected]);

  const filtered = useMemo(() => {
    if (!effectiveQuery) return students;
    const q = effectiveQuery;
    return students.filter((s) => {
      const name = (s.full_name || "").toLowerCase();
      const meta = (s.status || "").toLowerCase();
      const haystack = `${name} ${meta}`.trim();

      if (haystack.startsWith(q)) return true;
      if (haystack.includes(q)) return true;

      const tokens = haystack.split(/\s+/g);
      return tokens.some((t) => t.startsWith(q));
    });
  }, [students, effectiveQuery]);

  const selectStudent = (student: StudentComboboxItem) => {
    onChange(student.id);
    setQuery(student.full_name);
    setOpen(false);
    setHasEditedSinceOpen(false);
  };

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
        setHasEditedSinceOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div className={styles.root} ref={rootRef}>
      <input
        className={inputClassName}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange("");
          setHasEditedSinceOpen(true);
          setOpen(true);
        }}
        onFocus={() => {
          setHasEditedSinceOpen(false);
          if (selected) setQuery(selected.full_name);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter") {
            const first = filtered[0];
            if (first) selectStudent(first);
          }
        }}
      />

      {open && (
        <div className={styles.menu} role="listbox" aria-label="Students">
          {filtered.length === 0 ? (
            <div className={styles.empty}>No matches.</div>
          ) : (
            filtered.map((s) => (
              <button key={s.id} type="button" className={styles.item} onClick={() => selectStudent(s)} title={s.full_name}>
                <div className={styles.title}>{s.full_name}</div>
                <div className={styles.meta}>{s.status || ""}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
