export async function updateSkill(skill) {
  await fetch('https://skillhex.app/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(skill)
  });
}
