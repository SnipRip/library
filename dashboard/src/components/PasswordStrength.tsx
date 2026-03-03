"use client";

import React from 'react';

function scorePassword(pw: string) {
  let score = 0;
  if (!pw) return { score: 0, label: 'Empty' };
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Very Weak', 'Weak', 'Okay', 'Good', 'Strong', 'Very Strong'];
  return { score, label: labels[Math.min(score, labels.length - 1)] };
}

export default function PasswordStrength({ password }: { password: string }) {
  const { score, label } = scorePassword(password || '');
  const pct = Math.round((score / 5) * 100);
  const color = score <= 1 ? '#ef4444' : score <= 3 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 8, width: '100%', background: '#e6e6e6', borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#374151' }}>{label}</div>
    </div>
  );
}
