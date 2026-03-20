"use client";

import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import styles from "./books.module.css";

type BookSection = {
  id: string;
  name: string;
};

type BookRow = {
  id: string;
  section_id: string;
  section_name?: string;
  title: string;
  unique_number: string;
  thumbnail_url?: string | null;
  active_issue_id?: string | null;
  issued_to_student_name?: string | null;
  issued_date?: string | null;
  due_date?: string | null;
};

type StudentMini = {
  id: string;
  full_name: string;
  status?: string;
};

type ActiveIssueRow = {
  id: string;
  book_id: string;
  unique_number: string;
  title: string;
  student_id: string;
  student_name: string;
  issued_date: string;
  due_date: string | null;
  status: string;
};

async function fetchJSON(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

export default function LibraryBooksPage() {
  const [sections, setSections] = useState<BookSection[]>([]);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [students, setStudents] = useState<StudentMini[]>([]);
  const [activeIssues, setActiveIssues] = useState<ActiveIssueRow[]>([]);

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const [newSectionName, setNewSectionName] = useState<string>("");
  const [creatingSection, setCreatingSection] = useState<boolean>(false);

  const [newBookUniqueNumber, setNewBookUniqueNumber] = useState<string>("");
  const [newBookTitle, setNewBookTitle] = useState<string>("");
  const [newBookThumbnailFile, setNewBookThumbnailFile] = useState<File | null>(null);
  const [creatingBook, setCreatingBook] = useState<boolean>(false);

  const [issueBookId, setIssueBookId] = useState<string>("");
  const [issueStudentId, setIssueStudentId] = useState<string>("");
  const [issuing, setIssuing] = useState<boolean>(false);

  const selectedSection = useMemo(() => sections.find((s) => s.id === selectedSectionId) ?? null, [sections, selectedSectionId]);

  const refresh = async () => {
    const token = getAuthToken();
    if (!token) return;

    const [sectionsRes, studentsRes, issuesRes] = await Promise.all([
      fetchJSON(`${API_BASE_URL}/library/book-sections`, token),
      fetchJSON(`${API_BASE_URL}/students`, token),
      fetchJSON(`${API_BASE_URL}/library/book-issues`, token),
    ]);

    const nextSections = Array.isArray(sectionsRes.body) ? (sectionsRes.body as BookSection[]) : [];
    setSections(nextSections);

    const nextStudents = Array.isArray(studentsRes.body) ? (studentsRes.body as StudentMini[]) : [];
    setStudents(nextStudents);

    const nextIssues = Array.isArray(issuesRes.body) ? (issuesRes.body as ActiveIssueRow[]) : [];
    setActiveIssues(nextIssues);

    const effectiveSectionId = selectedSectionId ?? nextSections[0]?.id ?? null;
    setSelectedSectionId(effectiveSectionId);

    if (effectiveSectionId) {
      const booksRes = await fetchJSON(
        `${API_BASE_URL}/library/books?section_id=${encodeURIComponent(effectiveSectionId)}`,
        token,
      );
      setBooks(Array.isArray(booksRes.body) ? (booksRes.body as BookRow[]) : []);
    } else {
      setBooks([]);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const token = getAuthToken();
      if (!token) return;
      if (!selectedSectionId) {
        setBooks([]);
        return;
      }
      const booksRes = await fetchJSON(
        `${API_BASE_URL}/library/books?section_id=${encodeURIComponent(selectedSectionId)}`,
        token,
      );
      setBooks(Array.isArray(booksRes.body) ? (booksRes.body as BookRow[]) : []);
    })().catch(() => {
      setBooks([]);
    });
  }, [selectedSectionId]);

  const createSection = async () => {
    const name = newSectionName.trim();
    if (!name) return;

    const token = getAuthToken();
    if (!token) return;

    setCreatingSection(true);
    try {
      const res = await fetchJSON(`${API_BASE_URL}/library/book-sections`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        alert(res.body?.message || "Failed to add section");
        return;
      }

      setNewSectionName("");
      await refresh();
      if (res.body?.id) setSelectedSectionId(String(res.body.id));
    } finally {
      setCreatingSection(false);
    }
  };

  const createBook = async () => {
    const unique_number = newBookUniqueNumber.trim();
    const title = newBookTitle.trim();
    if (!selectedSectionId) return;
    if (!unique_number || !title) return;

    const token = getAuthToken();
    if (!token) return;

    setCreatingBook(true);
    try {
      const res = await fetchJSON(`${API_BASE_URL}/library/books`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: selectedSectionId,
          unique_number,
          title,
        }),
      });

      if (!res.ok) {
        alert(res.body?.message || "Failed to add book");
        return;
      }

      const createdBookId = String(res.body?.id ?? "");
      if (createdBookId && newBookThumbnailFile) {
        const fd = new FormData();
        fd.append("thumbnail", newBookThumbnailFile);

        const uploadRes = await fetch(`${API_BASE_URL}/library/books/${encodeURIComponent(createdBookId)}/thumbnail`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!uploadRes.ok) {
          const uploadBody = await uploadRes.json().catch(() => null);
          alert(uploadBody?.message || "Book added, but thumbnail upload failed");
        }
      }

      setNewBookUniqueNumber("");
      setNewBookTitle("");
      setNewBookThumbnailFile(null);
      await refresh();
    } finally {
      setCreatingBook(false);
    }
  };

  const issueBook = async () => {
    if (!issueBookId || !issueStudentId) return;

    const token = getAuthToken();
    if (!token) return;

    setIssuing(true);
    try {
      const res = await fetchJSON(`${API_BASE_URL}/library/book-issues`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: issueBookId, student_id: issueStudentId }),
      });

      if (!res.ok) {
        alert(res.body?.message || "Failed to issue book");
        return;
      }

      setIssueBookId("");
      setIssueStudentId("");
      await refresh();
    } finally {
      setIssuing(false);
    }
  };

  const returnBook = async (issueId: string) => {
    const token = getAuthToken();
    if (!token) return;

    const res = await fetchJSON(`${API_BASE_URL}/library/book-issues/${encodeURIComponent(issueId)}/return`, token, {
      method: "PATCH",
    });

    if (!res.ok) {
      alert(res.body?.message || "Failed to return book");
      return;
    }

    await refresh();
  };

  const availableBooks = useMemo(() => books.filter((b) => !b.active_issue_id), [books]);

  return (
    <>
      <TopNav title="Book Management" />

      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Library Books</h1>
          <button type="button" className={styles.button} onClick={() => void refresh()}>
            Refresh
          </button>
        </div>

        <div className={styles.layout}>
          {/* Sections */}
          <div className={`${styles.card} ${styles.sectionsCard}`}>
            <div className={styles.cardHeader}>
              <h3>Sections</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.formRow}>
                <input
                  className={styles.input}
                  placeholder="e.g. Story, Academic"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                />
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  onClick={() => void createSection()}
                  disabled={creatingSection || !newSectionName.trim()}
                >
                  Add
                </button>
              </div>

              {sections.length === 0 ? (
                <div className={styles.empty}>No sections yet.</div>
              ) : (
                <ul className={styles.list} aria-label="Book sections">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={`${styles.listItemBtn} ${selectedSectionId === s.id ? styles.listItemActive : ""}`}
                        onClick={() => setSelectedSectionId(s.id)}
                        title={s.name}
                      >
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Books */}
          <div className={`${styles.card} ${styles.booksCard}`}>
            <div className={styles.cardHeader}>
              <h3>Books{selectedSection ? ` — ${selectedSection.name}` : ""}</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.bookFormRow}>
                <input
                  className={styles.input}
                  placeholder="Unique No."
                  value={newBookUniqueNumber}
                  onChange={(e) => setNewBookUniqueNumber(e.target.value)}
                />
                <input
                  className={styles.input}
                  placeholder="Book Title"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                />
                <input
                  className={`${styles.input} ${styles.fileInput}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewBookThumbnailFile(e.target.files?.[0] ?? null)}
                  title="Upload cover image (optional)"
                />
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  onClick={() => void createBook()}
                  disabled={creatingBook || !selectedSectionId || !newBookUniqueNumber.trim() || !newBookTitle.trim()}
                >
                  Add
                </button>
              </div>

              {!selectedSectionId ? (
                <div className={styles.empty}>Select a section to view books.</div>
              ) : books.length === 0 ? (
                <div className={styles.empty}>No books in this section yet.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th></th>
                      <th>UNIQUE NO</th>
                      <th>TITLE</th>
                      <th>STATUS</th>
                      <th>WITH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((b) => (
                      <tr key={b.id}>
                        <td>
                          {b.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className={styles.thumb} src={b.thumbnail_url} alt={b.title} />
                          ) : (
                            <div className={styles.thumb} aria-hidden="true" />
                          )}
                        </td>
                        <td>{b.unique_number}</td>
                        <td>{b.title}</td>
                        <td>
                          {b.active_issue_id ? (
                            <span className={`${styles.badge} ${styles.badgeIssued}`}>Issued</span>
                          ) : (
                            <span className={`${styles.badge} ${styles.badgeAvailable}`}>Available</span>
                          )}
                        </td>
                        <td className={styles.muted}>{b.active_issue_id ? (b.issued_to_student_name || "—") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Issue / Active */}
          <div className={`${styles.card} ${styles.issueCard}`}>
            <div className={styles.cardHeader}>
              <h3>Issue / Return</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.block}>
                <div className={styles.row}>
                  <select className={styles.input} value={issueBookId} onChange={(e) => setIssueBookId(e.target.value)}>
                    <option value="">Select available book</option>
                    {availableBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.unique_number} — {b.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.row}>
                  <select className={styles.input} value={issueStudentId} onChange={(e) => setIssueStudentId(e.target.value)}>
                    <option value="">Select student</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary} ${styles.fullWidth}`}
                  onClick={() => void issueBook()}
                  disabled={issuing || !issueBookId || !issueStudentId}
                >
                  Issue Book
                </button>
              </div>

              <div className={styles.dividerBlock}>
                <div className={styles.subHeaderRow}>
                  <div className={styles.subHeaderTitle}>Currently Issued</div>
                  <div className={styles.subHeaderMeta}>{activeIssues.length}</div>
                </div>

                {activeIssues.length === 0 ? (
                  <div className={styles.empty}>No active issues.</div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>BOOK</th>
                        <th>STUDENT</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeIssues.map((i) => (
                        <tr key={i.id}>
                          <td>
                            <div className={styles.strong}>{i.unique_number}</div>
                            <div className={styles.muted}>{i.title}</div>
                          </td>
                          <td>
                            <div className={styles.semiStrong}>{i.student_name}</div>
                            <div className={styles.metaText}>
                              Issued: {i.issued_date}
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className={`${styles.button} ${styles.buttonDanger}`}
                              onClick={() => void returnBook(i.id)}
                              title="Return book"
                            >
                              Return
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
