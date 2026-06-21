import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { StorageManager } from '../utils/storage';
import { UserData } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

// ─── Firestore helpers ────────────────────────────────────────────────────────

const USER_DOC = (uid: string) => doc(db, 'users', uid);

/** Load user data from Firestore. Returns null if no document exists yet. */
export const loadCloudData = async (uid: string): Promise<UserData | null> => {
  try {
    const snap = await getDoc(USER_DOC(uid));
    return snap.exists() ? (snap.data() as UserData) : null;
  } catch {
    return null;
  }
};

/** Save user data to Firestore. */
export const saveCloudData = async (uid: string, data: UserData): Promise<void> => {
  try {
    await setDoc(USER_DOC(uid), data, { merge: true });
  } catch (err) {
    console.error('Failed to save to Firestore:', err);
  }
};

/**
 * Migrate localStorage data → Firestore on first login.
 * The cloud data wins if it has more XP; otherwise the local data wins.
 */
const migrateLocalToCloud = async (uid: string): Promise<void> => {
  const local = StorageManager.getUserData();
  const cloud = await loadCloudData(uid);

  if (!cloud) {
    // First time logging in — push local data up
    await saveCloudData(uid, local);
  } else if (local.stats.totalXP > cloud.stats.totalXP) {
    // Local is ahead — merge favouring local
    await saveCloudData(uid, { ...cloud, ...local, stats: local.stats });
  }
  // else cloud is ahead — nothing to do, App will load from cloud
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    await migrateLocalToCloud(result.user.uid);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await migrateLocalToCloud(result.user.uid);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await migrateLocalToCloud(result.user.uid);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
