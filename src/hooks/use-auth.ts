"use client";

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';

export function useAuth() {
  // Handle case where auth might be null during build
  const [user, loading, error] = useAuthState(auth);
  
  const logout = async () => {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };
  
  return { 
    user, 
    loading: loading || !auth, // Consider loading if auth not initialized
    error, 
    logout 
  };
}