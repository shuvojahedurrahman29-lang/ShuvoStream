/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

// User's custom web app Firebase configuration (for authentication)
const userFirebaseConfig = {
  apiKey: "AIzaSyCK-i3p75ouAWtcOlW4yVj4LucwIL_ezOQ",
  authDomain: "shuvostream-fbebe.firebaseapp.com",
  projectId: "shuvostream-fbebe",
  storageBucket: "shuvostream-fbebe.firebasestorage.app",
  messagingSenderId: "520422909863",
  appId: "1:520422909863:web:f6508d18165099a9953882",
  measurementId: "G-S332DPZ1T6"
};

// Initialize app for firestore database (using the default applet config)
const appletApp = initializeApp(firebaseConfig, "applet");
export const db = getFirestore(appletApp, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const appletAuth = getAuth(appletApp);

// Initialize app for authentication (using the user's custom config)
const userApp = initializeApp(userFirebaseConfig);
export const auth = getAuth(userApp);

// Initialize analytics safely if supported in the preview iframe
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(userApp);
  }
});

import { signInWithCredential } from 'firebase/auth';
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, signOut, signInWithCredential, GoogleAuthProvider };

// Relational DB test on load as recommended
import { doc, getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
