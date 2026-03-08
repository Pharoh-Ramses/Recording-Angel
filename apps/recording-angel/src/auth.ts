const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[bytes[i]! % CHARS.length];
  }
  return code;
}

export function generateHostToken(): string {
  return crypto.randomUUID();
}

export function validateApiKey(
  provided: string | null,
  expected: string,
): boolean {
  if (!provided || provided.length === 0) return false;

  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);

  if (a.byteLength !== b.byteLength) return false;

  let mismatch = 0;
  for (let i = 0; i < a.byteLength; i++) {
    mismatch |= a[i]! ^ b[i]!;
  }
  return mismatch === 0;
}
