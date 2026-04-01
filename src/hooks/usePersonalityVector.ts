import { useCallback, useState } from 'react';
import {
  EMPTY_VECTOR,
  evolvePersonalityVector,
  persistSovereignIdentity,
  type PersonalityAction,
  type PersonalityVector,
} from '../services/personalityService';

export function usePersonalityVector(uid: string | null | undefined) {
  const [vector, setVector] = useState<PersonalityVector>(EMPTY_VECTOR);
  const [identityHash, setIdentityHash] = useState<string>('');

  const recordAction = useCallback(
    async (action: PersonalityAction) => {
      setVector(prev => {
        const next = evolvePersonalityVector(prev, action);
        if (uid) {
          persistSovereignIdentity(uid, next)
            .then(setIdentityHash)
            .catch((error) => console.error('persistSovereignIdentity error', error));
        }
        return next;
      });
    },
    [uid],
  );

  return { vector, identityHash, recordAction };
}
