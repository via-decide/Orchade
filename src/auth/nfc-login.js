export async function loginViaNFC(uid) {
  const normalizedUid = String(uid || '').trim();
  if (!normalizedUid) {
    throw new Error('NFC uid is required.');
  }

  const res = await fetch(`https://daxini.space/passport/verify?uid=${encodeURIComponent(normalizedUid)}`);
  if (!res.ok) {
    throw new Error(`NFC login failed with status ${res.status}`);
  }

  const data = await res.json();
  if (typeof window !== 'undefined' && data?.token) {
    window.localStorage.setItem('passport_token', data.token);
  }

  return data;
}
