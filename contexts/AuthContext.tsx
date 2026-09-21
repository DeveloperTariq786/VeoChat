'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  deleteDoc,
  query as firestoreQuery,
  orderBy,
  limit,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { searchThreadStore } from '@/lib/searchThreadStore';
import { VideoItem } from '@/types/video';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface SavedSearchRecord {
  id: string;
  userId: string;
  query: string;
  resultsCount: number;
  videos: VideoItem[];
  source?: string;
  timestamp: number;
  createdAt: string;
}

export interface QuizQuestionSummary {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation?: string;
  timestamp?: string;
  seconds?: number;
}

export interface SavedQuizAttempt {
  id: string;
  userId: string;
  videoId: string;
  videoTitle: string;
  videoChannel: string;
  videoThumbnail: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  difficulty: string;
  timestamp: number;
  createdAt: string;
  questionsSummary: QuizQuestionSummary[];
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  saveSearchHistory: (query: string, videos: VideoItem[], source?: string) => Promise<void>;
  getSearchHistory: () => Promise<SavedSearchRecord[]>;
  deleteSearchHistoryItem: (searchId: string) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  saveQuizAttempt: (attempt: Omit<SavedQuizAttempt, 'id' | 'userId' | 'timestamp' | 'createdAt'> & { id?: string }) => Promise<string | null>;
  getQuizHistory: () => Promise<SavedQuizAttempt[]>;
  deleteQuizAttempt: (quizId: string) => Promise<void>;
  clearQuizHistory: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => null,
  logout: async () => {},
  saveSearchHistory: async () => {},
  getSearchHistory: async () => [],
  deleteSearchHistoryItem: async () => {},
  clearSearchHistory: async () => {},
  saveQuizAttempt: async () => null,
  getQuizHistory: async () => [],
  deleteQuizAttempt: async () => {},
  clearQuizHistory: async () => {},
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

      await setDoc(
        userRef,
        {
          ...profileData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setProfile(profileData);
    } catch (err) {
      console.warn('Failed to sync user profile to Firestore:', err);
      // Fallback local profile state so the UI functions smoothly
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

  const saveSearchHistory = useCallback(
    async (query: string, videos: VideoItem[], source?: string) => {
      if (!user) return;
      try {
        const searchId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const searchRef = doc(db, 'users', user.uid, 'searches', searchId);

        // Sanitize video items to avoid undefined values which Firestore rejects
        const sanitizedVideos = (videos || []).map((v) => ({
          id: v.id || '',
          title: v.title || '',
          thumbnail: v.thumbnail || '',
          channel: v.channel || '',
          channelUrl: v.channelUrl || '',
          views: v.views !== undefined ? String(v.views) : '',
          duration: v.duration || '',
          link: v.link || '',
          description: v.description || '',
          publishedAt: v.publishedAt || '',
        }));

        await setDoc(searchRef, {
          id: searchId,
          userId: user.uid,
          query,
          resultsCount: sanitizedVideos.length,
          videos: sanitizedVideos,
          source: source || 'serpapi',
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
        });
        console.log(`[Firebase] Saved search query "${query}" with ${sanitizedVideos.length} videos`);
      } catch (err) {
        console.warn('Could not save search history to Firestore:', err);
      }
    },
    [user]
  );

  const getSearchHistory = useCallback(async (): Promise<SavedSearchRecord[]> => {
    if (!user) return [];
    try {
      const searchesCol = collection(db, 'users', user.uid, 'searches');
      const q = firestoreQuery(searchesCol, orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      const records: SavedSearchRecord[] = [];
      snap.forEach((d) => {
        records.push(d.data() as SavedSearchRecord);
      });
      return records;
    } catch (err) {
      console.warn('Could not fetch search history from Firestore:', err);
      return [];
    }
  }, [user]);

  const deleteSearchHistoryItem = useCallback(
    async (searchId: string): Promise<void> => {
      if (!user) return;
      try {
        const itemRef = doc(db, 'users', user.uid, 'searches', searchId);
        await deleteDoc(itemRef);
      } catch (err) {
        console.warn('Could not delete search history item:', err);
      }
    },
    [user]
  );

  const clearSearchHistory = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      const searchesCol = collection(db, 'users', user.uid, 'searches');
      const snap = await getDocs(searchesCol);
      const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    } catch (err) {
      console.warn('Could not clear search history:', err);
    }
  }, [user]);

  const saveQuizAttempt = useCallback(
    async (
      attempt: Omit<SavedQuizAttempt, 'id' | 'userId' | 'timestamp' | 'createdAt'> & { id?: string }
    ): Promise<string | null> => {
      if (!user) return null;
      try {
        const attemptId = attempt.id || `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const quizRef = doc(db, 'users', user.uid, 'quizHistory', attemptId);

        const sanitizedSummary = (attempt.questionsSummary || []).map((q) => ({
          question: q.question || '',
          userAnswer: q.userAnswer || '',
          correctAnswer: q.correctAnswer || '',
          correct: Boolean(q.correct),
          explanation: q.explanation || '',
          timestamp: q.timestamp || '',
          seconds: typeof q.seconds === 'number' ? q.seconds : 0,
        }));

        const record: SavedQuizAttempt = {
          id: attemptId,
          userId: user.uid,
          videoId: attempt.videoId || '',
          videoTitle: attempt.videoTitle || 'Untitled Video',
          videoChannel: attempt.videoChannel || 'Unknown Creator',
          videoThumbnail: attempt.videoThumbnail || '',
          score: attempt.score ?? 0,
          totalQuestions: attempt.totalQuestions ?? 0,
          percentage: attempt.percentage ?? 0,
          difficulty: attempt.difficulty || 'all',
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          questionsSummary: sanitizedSummary,
        };

        await setDoc(quizRef, record);
        console.log(`[Firebase] Saved quiz attempt "${attemptId}" with score ${record.score}/${record.totalQuestions}`);
        return attemptId;
      } catch (err) {
        console.warn('Could not save quiz attempt to Firestore:', err);
        return null;
      }
    },
    [user]
  );

  const getQuizHistory = useCallback(async (): Promise<SavedQuizAttempt[]> => {
    if (!user) return [];
    try {
      const quizCol = collection(db, 'users', user.uid, 'quizHistory');
      const q = firestoreQuery(quizCol, orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      const records: SavedQuizAttempt[] = [];
      snap.forEach((d) => {
        records.push(d.data() as SavedQuizAttempt);
      });
      return records;
    } catch (err) {
      console.warn('Could not fetch quiz history from Firestore:', err);
      return [];
    }
  }, [user]);

  const deleteQuizAttempt = useCallback(
    async (quizId: string): Promise<void> => {
      if (!user) return;
      try {
        const itemRef = doc(db, 'users', user.uid, 'quizHistory', quizId);
        await deleteDoc(itemRef);
      } catch (err) {
        console.warn('Could not delete quiz history attempt:', err);
      }
    },
    [user]
  );

  const clearQuizHistory = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      const quizCol = collection(db, 'users', user.uid, 'quizHistory');
      const snap = await getDocs(quizCol);
      const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    } catch (err) {
      console.warn('Could not clear quiz history:', err);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        logout,
        saveSearchHistory,
        getSearchHistory,
        deleteSearchHistoryItem,
        clearSearchHistory,
        saveQuizAttempt,
        getQuizHistory,
        deleteQuizAttempt,
        clearQuizHistory,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
