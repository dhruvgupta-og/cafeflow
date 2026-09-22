import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Info } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptedLogin, setAttemptedLogin] = useState(false);
  const { signIn, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  // Once signIn resolves and userProfile is populated, check role
  useEffect(() => {
    if (!attemptedLogin || !userProfile) return;
    if (userProfile.role === 'platform_admin') {
      navigate('/admin');
    } else {
      // Logged in but not admin — sign them out and show error
      logout();
      setError('This account does not have Super Admin access. Use /cafe/login for cafe staff accounts.');
      setAttemptedLogin(false);
    }
  }, [userProfile, attemptedLogin, navigate, logout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      setAttemptedLogin(true);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many failed attempts. Please wait a moment and try again.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-stone-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
          <Shield className="w-8 h-8 text-stone-950" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight font-serif text-stone-100">
          Super Admin Console
        </h2>
        <p className="mt-2 text-sm text-stone-400">
          Platform-wide multi-tenant control & billing management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-stone-900 py-8 px-6 shadow-xl border border-stone-800 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="admin@cafeflow.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In as Platform Admin'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Setup hint */}
          <div className="mt-6 pt-5 border-t border-stone-800 flex items-start gap-2 text-xs text-stone-500">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              First time? Create a user in Firebase Console → Authentication, then run{' '}
              <code className="text-amber-400 bg-stone-800 px-1 rounded">npx tsx backend/scripts/set-admin-claim.ts &lt;UID&gt;</code>{' '}
              to grant Super Admin access.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
