"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserAdminSetupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/users');
  }, [router]);

  return null;
}
