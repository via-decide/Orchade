export async function sendOrchadeEvent(event) {
  await fetch('https://logichub.app/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
}
