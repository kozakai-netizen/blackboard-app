'use client';
import { useEffect, useState } from 'react';

export default function SetEmp() {
  const [done, setDone] = useState(false);
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const code  = params?.get('code')  ?? '';
  const place = params?.get('place') ?? 'dandoli-sample1';
  const only  = params?.get('only')  ?? '1';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const trimmed = (code || '').trim();
    if (trimmed) {
      localStorage.setItem('dw:empcode', trimmed);
      console.info('[set-emp] saved dw:empcode =', trimmed);
      setDone(true);
      setTimeout(() => {
        const next = `/sites?debug=1&only=${only}&place=${encodeURIComponent(place)}`;
        window.location.replace(next);
      }, 800);
    }
  }, [code, place, only]);

  return (
    <main className="p-6">
      <h1 className="text-lg font-semibold">Set Employee Code</h1>
      <p className="mt-2 text-sm text-gray-600">
        code={code || '(none)'} / place={place}
      </p>
      <p className="mt-2">{done ? '保存しました。自動で移動します…' : '保存待ち...'}</p>
      <p className="mt-4 text-xs text-gray-500">
        手動移動: <a className="underline" href={`/sites?debug=1&only=${only}&place=${encodeURIComponent(place)}`}>/sites</a>
      </p>
    </main>
  );
}
