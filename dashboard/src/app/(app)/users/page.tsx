"use client";

import { useMemo, useState } from 'react';
import TopNav from '@/components/TopNav';
import styles from './page.module.css';
import { AddUserModal } from '@/components/modals/Modals';

type User = {
  id: string;
  username: string;
  email: string;
  default_password: string;
  original_name?: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  phone?: string;
  alternate_phone?: string;
  pan?: string;
  aadhar?: string;
  documents?: Array<{ name: string; type: string; size: number; lastModified: number }>;
  role: string;
  created_at: string;
};

const STORAGE_KEY = 'aedify.users';

function makeId() {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return uuid;
  } catch {
    // ignore
  }
  return `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((u) => u && typeof u === 'object')
        .map((u) => {
          const obj = u as Record<string, unknown>;
          const docs = Array.isArray(obj.documents)
            ? (obj.documents as unknown[])
                .filter((d) => d && typeof d === 'object')
                .map((d) => {
                  const doc = d as Record<string, unknown>;
                  return {
                    name: typeof doc.name === 'string' ? doc.name : 'document',
                    type: typeof doc.type === 'string' ? doc.type : 'application/octet-stream',
                    size: typeof doc.size === 'number' ? doc.size : 0,
                    lastModified: typeof doc.lastModified === 'number' ? doc.lastModified : 0,
                  };
                })
            : [];

          return {
            id: typeof obj.id === 'string' ? obj.id : makeId(),
            username: typeof obj.username === 'string' ? obj.username : '',
            email: typeof obj.email === 'string' ? obj.email : '',
            default_password: typeof obj.default_password === 'string' ? obj.default_password : '',
            original_name: typeof obj.original_name === 'string' ? obj.original_name : '',
            first_name: typeof obj.first_name === 'string' ? obj.first_name : '',
            last_name: typeof obj.last_name === 'string' ? obj.last_name : '',
            address: typeof obj.address === 'string' ? obj.address : '',
            phone: typeof obj.phone === 'string' ? obj.phone : '',
            alternate_phone: typeof obj.alternate_phone === 'string' ? obj.alternate_phone : '',
            pan: typeof obj.pan === 'string' ? obj.pan : '',
            aadhar: typeof obj.aadhar === 'string' ? obj.aadhar : '',
            documents: docs,
            role: typeof obj.role === 'string' ? obj.role : 'user',
            created_at: typeof obj.created_at === 'string' ? obj.created_at : new Date().toISOString(),
          } satisfies User;
        })
        .filter((u) => !!u.username && !!u.email);
    } catch {
      return [];
    }
  });
  const [isAddOpen, setIsAddOpen] = useState(false);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return bt - at;
    });
  }, [users]);

  function persist(next: User[]) {
    setUsers(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function handleCreateUser(payload: {
    username: string;
    email: string;
    default_password: string;
    original_name: string;
    first_name: string;
    last_name: string;
    address: string;
    phone: string;
    alternate_phone: string;
    pan: string;
    aadhar: string;
    documents: Array<{ name: string; type: string; size: number; lastModified: number }>;
    role: string;
  }) {
    const username = payload.username.trim();
    const email = payload.email.trim();

    if (!username || !email || !payload.default_password) {
      alert('Username, Email, and Default Password are required');
      return;
    }

    const exists = users.some(
      (u) => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase(),
    );
    if (exists) {
      alert('User already exists');
      return;
    }

    const newUser: User = {
      id: makeId(),
      username,
      email,
      default_password: payload.default_password,
      original_name: payload.original_name,
      first_name: payload.first_name,
      last_name: payload.last_name,
      address: payload.address,
      phone: payload.phone,
      alternate_phone: payload.alternate_phone,
      pan: payload.pan,
      aadhar: payload.aadhar,
      documents: payload.documents,
      role: payload.role,
      created_at: new Date().toISOString(),
    };

    persist([newUser, ...users]);
  }

  return (
    <>
      <TopNav title="Users" />

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Users</h1>
          <div className={styles.controls}>
            <button className={styles.addButton} onClick={() => setIsAddOpen(true)}>
              <span>+</span> Add User
            </button>
          </div>
        </div>

        <AddUserModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onCreate={(payload) => {
            handleCreateUser(payload);
            setIsAddOpen(false);
          }}
        />

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>USERNAME</th>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>PAN</th>
                <th>AADHAAR</th>
                <th>ROLE</th>
                <th>CREATED</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.username}</td>
                  <td>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{u.email}</td>
                  <td>{u.phone || '-'}</td>
                  <td>{u.pan || '-'}</td>
                  <td>{u.aadhar || '-'}</td>
                  <td>
                    <span className={styles.roleBadge}>{u.role}</span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedUsers.length === 0 ? (
            <div className={styles.emptyState}>No users added yet. Click “Add User” to create one.</div>
          ) : null}
        </div>
      </div>
    </>
  );
}
