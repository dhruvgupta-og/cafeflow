import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  getIdTokenResult
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole, StaffPermissions } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Force-refresh the Firebase ID token to pick up newly-set custom claims,
   *  then re-resolve the user profile. Call this after any server-side
   *  setCustomUserClaims() call (e.g. after createCafeAndOwner returns). */
  refreshClaims: () => Promise<void>;
  isSuperAdmin: boolean;
  isCafeStaff: (cafeId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Resolve a UserProfile from a Firebase Auth User.
 *
 * Strategy (in order):
 *  1. Read custom claims from the ID token — fast, no extra DB read.
 *     This is the path used after Cloud Functions set claims via setCustomUserClaims().
 *  2. Fall back to /platformAdmins/{uid} existence check.
 *  3. Fall back to /users/{uid} document.
 *  4. Last resort: heuristic based on email address (for seed/demo accounts).
 */
async function resolveProfileFromUser(user: User): Promise<UserProfile> {
  try {
    // ── Step 1: Custom claims (fastest path, no DB read) ──────────────────
    const tokenResult = await getIdTokenResult(user);
    const claims = tokenResult.claims as Record<string, unknown>;

    if (claims.role === 'platform_admin') {
      return {
        uid: user.uid,
        email: user.email || '',
        name: (claims.name as string) || user.displayName || undefined,
        role: 'platform_admin',
      };
    }

    if (
      (claims.role === 'cafe_owner' || claims.role === 'staff') &&
      typeof claims.cafeId === 'string' && claims.cafeId
    ) {
      return {
        uid: user.uid,
        email: user.email || '',
        name: (claims.name as string) || user.displayName || undefined,
        role: claims.role as UserRole,
        cafeId: claims.cafeId,
        permissions: (claims.permissions as StaffPermissions) || undefined,
      };
    }

    // ── Step 2: platformAdmins document (seed/demo admin users) ───────────
    const adminDoc = await getDoc(doc(db, 'platformAdmins', user.uid));
    if (adminDoc.exists()) {
      return { uid: user.uid, email: user.email || '', role: 'platform_admin' };
    }

    // ── Step 3: /users/{uid} document (seed/demo cafe users) ─────────────
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        uid: user.uid,
        email: user.email || '',
        role: (data.role as UserRole) || 'cafe_owner',
        cafeId: data.cafeId,
        name: data.name,
        permissions: data.permissions,
      };
    }

    // ── Step 4: Basic fallback ─────────────────────────────────────────────
    return { uid: user.uid, email: user.email || '', role: 'cafe_owner' };

  } catch (err) {
    console.warn('[AuthContext] Could not resolve user profile:', err);
    return {
      uid: user.uid,
      email: user.email || '',
      role: 'cafe_owner',
    };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    // Real Firebase user — resolve via claims → DB fallback
    const profile = await resolveProfileFromUser(user);
    setUserProfile(profile);
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      fetchUserProfile(user);
    });
    return unsubscribe;
  }, [fetchUserProfile]);

  // ── refreshClaims ─────────────────────────────────────────────────────────
  const refreshClaims = useCallback(async () => {
    if (!currentUser) return;
    await currentUser.getIdToken(/* forceRefresh= */ true);
    const profile = await resolveProfileFromUser(currentUser);
    setUserProfile(profile);
  }, [currentUser]);

  // ── signIn ────────────────────────────────────────────────────────────────
  const signIn = async (email: string, pass: string) => {
    // Only attempt real sign in - fail if bad credentials
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const profile = await resolveProfileFromUser(cred.user);
    setCurrentUser(cred.user);
    setUserProfile(profile);
  };



  // ── logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    try { await fbSignOut(auth); } catch (e) { console.error(e); }
    setCurrentUser(null);
    setUserProfile(null);
  };

  // ── Derived helpers ───────────────────────────────────────────────────────
  const isSuperAdmin = userProfile?.role === 'platform_admin';
  const isCafeStaff = (targetCafeId: string) => {
    if (isSuperAdmin) return true;
    return (
      (userProfile?.role === 'cafe_owner' || userProfile?.role === 'staff') &&
      userProfile?.cafeId === targetCafeId
    );
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signIn,
        logout,
        refreshClaims,
        isSuperAdmin,
        isCafeStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
