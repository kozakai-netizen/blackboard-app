// lib/hash.ts
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return sha256Hex(buffer);
}

export async function sha256Blob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return sha256Hex(buffer);
}

export function isValidSHA256(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}

export function formatHashShort(hash: string, length = 8): string {
  if (!isValidSHA256(hash)) return 'invalid';
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
}
