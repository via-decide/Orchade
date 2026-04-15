export async function analyzeDecision(data) {
  const res = await fetch('https://logichub.app/zayvora/reason', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(`Zayvora reasoning failed with status ${res.status}`);
  }

  return res.json();
}
