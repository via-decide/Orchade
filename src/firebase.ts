import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, addDoc, serverTimestamp, getDocFromServer, FirestoreError } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { logger } from './lib/logger';
import { withRetry } from './lib/retry';

// Initialize Firebase
logger.info('Firebase initialization started', { projectId: firebaseConfig.projectId });
let app;
try {
  app = initializeApp(firebaseConfig);
  logger.info('Firebase app initialized successfully');
} catch (error) {
  logger.error('Firebase initialization error', { error });
  throw error;
}
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
logger.info('Firebase Auth and Firestore initialized');
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const signInWithGoogle = async () => {
  logger.info('Google sign-in popup starting');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    logger.info('Google sign-in popup succeeded', { uid: result.user.uid });
    return result;
  } catch (error) {
    logger.error('Google sign-in popup failed', { error });
    throw error;
  }
};

export const signInAsGuest = async () => {
  logger.info('Anonymous sign-in starting');
  try {
    const result = await signInAnonymously(auth);
    logger.info('Anonymous sign-in succeeded', { uid: result.user.uid });
    return result;
  } catch (error) {
    logger.error('Anonymous sign-in failed', { error });
    throw error;
  }
};

export const logout = () => signOut(auth);

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  logger.error('Firestore operation failed', errInfo as unknown as Record<string, unknown>);
  throw new Error(JSON.stringify(errInfo));
}

// Connection Test
async function testConnection() {
  try {
    await withRetry(() => getDocFromServer(doc(db, 'test', 'connection')), { attempts: 2, timeoutMs: 5000 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      logger.warn('Firebase connection test reports offline client');
    }
  }
}
testConnection();
