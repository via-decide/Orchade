import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type PersonalityQuadrant = 'patel' | 'socrates' | 'singh';

export type PersonalityVector = {
  patel: number;
  socrates: number;
  singh: number;
};

export type PersonalityAction =
  | 'planting'
  | 'construction'
  | 'research'
  | 'gene_lab'
  | 'harvest'
  | 'exchange'
  | 'transfer';

const ACTION_WEIGHTS: Record<PersonalityAction, Partial<PersonalityVector>> = {
  planting: { patel: 0.4 },
  construction: { patel: 0.4 },
  research: { socrates: 0.5 },
  gene_lab: { socrates: 0.5 },
  harvest: { singh: 0.6 },
  exchange: { singh: 0.6 },
  transfer: { singh: 0.6 },
};

export const EMPTY_VECTOR: PersonalityVector = { patel: 0, socrates: 0, singh: 0 };

function normalize(vector: PersonalityVector): PersonalityVector {
  const total = vector.patel + vector.socrates + vector.singh;
  if (total <= 0) return vector;

  return {
    patel: Number((vector.patel / total).toFixed(4)),
    socrates: Number((vector.socrates / total).toFixed(4)),
    singh: Number((vector.singh / total).toFixed(4)),
  };
}

export function evolvePersonalityVector(current: PersonalityVector, action: PersonalityAction): PersonalityVector {
  const delta = ACTION_WEIGHTS[action] ?? {};
  return normalize({
    patel: current.patel + (delta.patel ?? 0),
    socrates: current.socrates + (delta.socrates ?? 0),
    singh: current.singh + (delta.singh ?? 0),
  });
}

export function dominantQuadrant(vector: PersonalityVector): PersonalityQuadrant {
  const ranked = Object.entries(vector).sort((a, b) => b[1] - a[1]);
  return (ranked[0]?.[0] as PersonalityQuadrant) ?? 'patel';
}

async function sha256(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sovereignIdentityHash(uid: string, vector: PersonalityVector): Promise<string> {
  const payload = `${uid}:${vector.patel}:${vector.socrates}:${vector.singh}`;
  return sha256(payload);
}

export async function persistSovereignIdentity(uid: string, vector: PersonalityVector): Promise<string> {
  const hash = await sovereignIdentityHash(uid, vector);
  await setDoc(
    doc(db, 'sovereign_identities', uid),
    {
      uid,
      vector,
      sovereignIdentityHash: hash,
      updatedAt: serverTimestamp(),
      batchCohorts: [1, 2, 3],
    },
    { merge: true },
  );
  return hash;
}
