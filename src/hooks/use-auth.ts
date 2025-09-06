"use client";

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';

export function useAuth() {
  const [user, loading, error] = useAuthState(auth);
  
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };
  
  return { user, loading, error, logout };
}