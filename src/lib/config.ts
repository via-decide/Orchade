import firebaseConfig from '../../firebase-applet-config.json';

export interface RuntimeConfig {
  firebaseProjectId: string;
  firestoreDatabaseId?: string;
  geminiApiKeyConfigured: boolean;
  mode: string;
}

const requiredFirebaseKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;

export function validateRuntimeConfig(): RuntimeConfig {
  const missing = requiredFirebaseKeys.filter((key) => !firebaseConfig[key]);

  if (missing.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missing.join(', ')}`);
  }

  return {
    firebaseProjectId: firebaseConfig.projectId,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
    geminiApiKeyConfigured: Boolean(import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY),
    mode: import.meta.env.MODE,
  };
}

export const runtimeConfig = validateRuntimeConfig();
