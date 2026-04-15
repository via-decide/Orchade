export async function verifyPassport() {
  if (typeof window === 'undefined') {
    throw new Error('Passport verification is available only in browser runtime.');
  }

  const token = window.localStorage.getItem('passport_token');
  if (!token) {
    return { verified: false, reason: 'missing_token' };
  }

  const res = await fetch('https://daxini.space/api/verify', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`Passport verification failed with status ${res.status}`);
  }

  return res.json();
}
