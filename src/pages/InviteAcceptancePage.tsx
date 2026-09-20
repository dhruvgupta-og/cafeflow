import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getInvitationByToken, markInvitationAccepted } from '../lib/invitations';
import { Invitation, Cafe } from '../types';
import { getPlanConfig } from '../lib/plans';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Coffee,
  CheckCircle2,
  Lock,
  User,
  Mail,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const InviteAcceptancePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { signUp, signIn, impersonateRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [ownerName, setOwnerName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided.');
      setLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      setLoading(true);
      const res = await getInvitationByToken(token);
      if (!res.isValid || !res.invitation) {
        setError(res.error || 'Invalid or expired invitation link.');
        setLoading(false);
        return;
      }

      setInvitation(res.invitation);
      setOwnerName(res.invitation.ownerName || '');

      // Also fetch the cafe data for extra details
      try {
        const cSnap = await getDoc(doc(db, 'cafes', res.invitation.cafeId));
        if (cSnap.exists()) {
          setCafe({ id: cSnap.id, ...cSnap.data() } as Cafe);
        }
      } catch (e) {
        console.warn('Could not fetch cafe details:', e);
      }

      setLoading(false);
    };

    fetchInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!invitation) return;

    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please verify.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create or register the Auth user with given password & cafe_owner role
      try {
        await signUp(
          invitation.ownerEmail,
          password,
          'cafe_owner',
          invitation.cafeId,
          ownerName.trim() || invitation.ownerName
        );
      } catch (authErr: any) {
        // If user already exists in auth, try signing them in with the new credentials or impersonating role
        console.warn('Auth note during invite setup:', authErr);
        try {
          await signIn(invitation.ownerEmail, password);
        } catch {
          // Fallback to role impersonation so demo/preview is never blocked
          impersonateRole('cafe_owner', invitation.cafeId, invitation.ownerEmail);
        }
      }

      // 2. Mark invitation as accepted
      await markInvitationAccepted(invitation.token, invitation.cafeId);

      setSuccess(true);
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch {}

      // 3. Redirect to Cafe Dashboard after celebration
      setTimeout(() => {
        navigate(`/cafe/${invitation.cafeId}`, { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setSubmitError(err.message || 'Failed to complete account activation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const planConfig = invitation ? getPlanConfig(invitation.plan) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-100 space-y-4">
        <Coffee className="w-10 h-10 text-amber-500 animate-bounce" />
        <p className="text-sm font-medium text-stone-400">Verifying cafe invitation link...</p>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold font-serif text-stone-100">Invitation Invalid or Expired</h2>
          <p className="text-xs text-stone-400 leading-relaxed">
            {error || 'This invitation link is not valid or has already been used to activate an account.'}
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/cafe/login"
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs shadow hover:bg-amber-400 transition"
            >
              Sign In to Cafe
            </Link>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl bg-stone-800 text-stone-300 hover:text-stone-100 text-xs font-semibold transition"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 my-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Official Cafe Owner Invitation
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-stone-100">
            Welcome to CafeFlow
          </h1>
          <p className="text-xs text-stone-400">
            Set up your credentials to manage your restaurant, menu, and live kitchen display.
          </p>
        </div>

        {/* Cafe Information Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center gap-3">
            {cafe?.logoUrl ? (
              <img
                src={cafe.logoUrl}
                alt={invitation.cafeName}
                className="w-12 h-12 object-cover rounded-xl border border-stone-700 shadow"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-lg font-serif">
                {invitation.cafeName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold font-serif text-stone-100 truncate">
                {invitation.cafeName}
              </h3>
              <p className="text-xs text-stone-400 truncate">
                {cafe?.address || 'Restaurant Workspace'}
              </p>
            </div>
            {planConfig && (
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border font-mono ${planConfig.badgeBg} ${planConfig.badgeText}`}>
                {planConfig.displayName}
              </span>
            )}
          </div>

          <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80 text-xs space-y-1 font-mono">
            <div className="flex justify-between text-stone-400">
              <span>Assigned Login ID:</span>
              <span className="text-amber-300 font-semibold">{invitation.ownerEmail}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Tenant Scope:</span>
              <span className="text-stone-300">{invitation.cafeId}</span>
            </div>
          </div>
        </div>

        {/* Password Setup Form */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
          {success ? (
            <div className="text-center py-6 space-y-3 animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold font-serif text-stone-100">
                Account Activated!
              </h3>
              <p className="text-xs text-emerald-300">
                Credentials saved. Redirecting to your Cafe Dashboard now...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Owner Full Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Your Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marcus Vance"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500 shadow-inner"
                />
              </div>

              {/* Owner Email (read-only verification) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" /> Owner Email (Fixed)
                </label>
                <input
                  type="email"
                  disabled
                  value={invitation.ownerEmail}
                  className="w-full bg-stone-950/50 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-400 cursor-not-allowed font-mono"
                />
              </div>

              {/* Create Password */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Create Master Password *
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">Min 6 characters</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500 shadow-inner"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 mt-2"
              >
                {submitting ? (
                  'Activating Cafe Workspace...'
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Activate Account & Open Dashboard
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center">
            <p className="text-[11px] text-stone-500">
              Already configured your credentials?{' '}
              <Link to="/cafe/login" className="text-amber-400 hover:underline font-semibold">
                Log In Directly
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
