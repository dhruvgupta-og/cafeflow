import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, role: UserRole, cafeId?: string, name?: string) => Promise<string>;
  logout: () => Promise<void>;
  impersonateRole: (role: UserRole, cafeId?: string, email?: string) => void;
  isSuperAdmin: boolean;
  isCafeStaff: (cafeId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore simulated role or fetch from firestore
  const fetchUserProfile = async (user: User | null) => {
    if (!user) {
      // Check local storage for simulated/demo state if not logged in via Firebase
      const savedSim = localStorage.getItem('cafeflow_sim_user');
      if (savedSim) {
        try {
          const parsed = JSON.parse(savedSim);
          setUserProfile(parsed);
          setLoading(false);
          return;
        } catch {
          // ignore
        }
      }
      setUserProfile(null);
      setLoading(false);
      return;
    }

    try {
      // 1. Check if user is in platformAdmins
      const adminDoc = await getDoc(doc(db, 'platformAdmins', user.uid));
      if (adminDoc.exists()) {
        setUserProfile({
          uid: user.uid,
          email: user.email || '',
          role: 'platform_admin',
        });
        setLoading(false);
        return;
      }

      // 2. Check users collection
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          uid: user.uid,
          email: user.email || '',
          role: data.role || 'cafe_owner',
          cafeId: data.cafeId,
          name: data.name,
        });
      } else {
        // Fallback default if email contains admin
        if (user.email?.toLowerCase().includes('admin')) {
          setUserProfile({
            uid: user.uid,
            email: user.email,
            role: 'platform_admin'
          });
        } else {
          setUserProfile({
            uid: user.uid,
            email: user.email || '',
            role: 'cafe_owner'
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch user profile from Firestore:', err);
      // Fallback
      setUserProfile({
        uid: user.uid,
        email: user.email || '',
        role: user.email?.includes('admin') ? 'platform_admin' : 'cafe_owner'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      fetchUserProfile(user);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      localStorage.removeItem('cafeflow_sim_user');
      await fetchUserProfile(cred.user);
    } catch (err: any) {
      // If auth user does not exist in Firebase yet (e.g. quick testing with demo credentials), provide helpful fallback
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
        // Automatically create account for ease of testing or provide simulation
        try {
          const newCred = await createUserWithEmailAndPassword(auth, email, pass);
          const role: UserRole = email.includes('admin') ? 'platform_admin' : 'cafe_owner';
          await setDoc(doc(db, 'users', newCred.user.uid), {
            email,
            role,
            createdAt: new Date().toISOString()
          });
          if (role === 'platform_admin') {
            await setDoc(doc(db, 'platformAdmins', newCred.user.uid), { email });
          }
          await fetchUserProfile(newCred.user);
          return;
        } catch {
          // If creation also failed, simulate locally for demo continuity
          const role: UserRole = email.includes('admin') ? 'platform_admin' : 'cafe_owner';
          const simUser: UserProfile = {
            uid: 'demo-' + Math.random().toString(36).substring(7),
            email,
            role,
            cafeId: role === 'cafe_owner' ? 'cafe-velvet-roast' : undefined,
            name: email.split('@')[0]
          };
          localStorage.setItem('cafeflow_sim_user', JSON.stringify(simUser));
          setUserProfile(simUser);
          return;
        }
      }
      throw err;
    }
  };

  const signUp = async (email: string, pass: string, role: UserRole, cafeId?: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const profile: UserProfile = {
      uid: cred.user.uid,
      email,
      role,
      cafeId,
      name,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', cred.user.uid), profile);
    if (role === 'platform_admin') {
      await setDoc(doc(db, 'platformAdmins', cred.user.uid), { email });
    }
    return cred.user.uid;
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('cafeflow_sim_user');
    setCurrentUser(null);
    setUserProfile(null);
  };

  const impersonateRole = (role: UserRole, cafeId?: string, email?: string) => {
    const simUser: UserProfile = {
      uid: 'sim-' + role + '-' + (cafeId || 'default'),
      email: email || (role === 'platform_admin' ? 'admin@cafeflow.com' : 'owner@cafe.com'),
      role,
      cafeId: cafeId || (role !== 'platform_admin' ? 'cafe-velvet-roast' : undefined),
      name: role === 'platform_admin' ? 'Super Admin' : 'Elena (Owner)'
    };
    localStorage.setItem('cafeflow_sim_user', JSON.stringify(simUser));
    setUserProfile(simUser);
  };

  const isSuperAdmin = userProfile?.role === 'platform_admin';
  const isCafeStaff = (targetCafeId: string) => {
    if (isSuperAdmin) return true;
    return (userProfile?.role === 'cafe_owner' || userProfile?.role === 'staff') && userProfile?.cafeId === targetCafeId;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signIn,
        signUp,
        logout,
        impersonateRole,
        isSuperAdmin,
        isCafeStaff
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
