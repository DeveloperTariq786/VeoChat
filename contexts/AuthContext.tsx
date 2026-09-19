'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { searchThreadStore } from '@/lib/searchThreadStore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  saveSearchHistory: (query: string, resultsCount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => null,
  logout: async () => {},
  saveSearchHistory: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      const now = new Date().toISOString();
      const existingData = userSnap.exists() ? userSnap.data() : null;

      const profileData: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'VeoChat Explorer',
        photoURL: firebaseUser.photoURL || '',
        createdAt: existingData?.createdAt || now,
        lastLoginAt: now,
      };

      await setDoc(userRef, {
        ...profileData,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setProfile(profileData);
    } catch (err) {
      console.warn('Failed to sync user profile to Firestore:', err);
      // Still set local profile state from Auth object so the UI functions seamlessly
      setProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'VeoChat Explorer',
        photoURL: firebaseUser.photoURL || '',
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await syncUserProfile(firebaseUser);
      } else {
        setProfile(null);
        searchThreadStore.clear();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<User | null> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        searchThreadStore.clear();
        await syncUserProfile(result.user);
        return result.user;
      }
      return null;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      searchThreadStore.clear();
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const saveSearchHistory = async (query: string, resultsCount: number) => {
    if (!user) return;
    try {
      const searchId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const searchRef = doc(db, 'users', user.uid, 'searches', searchId);
      await setDoc(searchRef, {
        id: searchId,
        userId: user.uid,
        query,
        resultsCount,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Could not save search history to Firestore:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        logout,
        saveSearchHistory,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
