import React, { useState, useEffect } from 'react';
import { Cafe, Invitation } from '../../types';
import { createCafeInvitation, getInviteUrl } from '../../lib/invitations';
import { getPlanConfig } from '../../lib/plans';
import {
  X,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Send,
  Sparkles,
  RefreshCw,
  ShieldAlert,
  Clock,
  Coffee,
  ArrowRight
} from 'lucide-react';

interface Props {
  cafe: Cafe | null;
  isOpen?: boolean;
  onClose: () => void;
  existingInvitation?: Invitation | null;
}

export const AdminInviteModal: React.FC<Props> = ({ cafe, isOpen = true, onClose, existingInvitation }) => {
  if (!isOpen || !cafe) return null;

  const [invitation, setInvitation] = useState<Invitation | null>(existingInvitation || null);
  const [loading, setLoading] = useState(!existingInvitation);
  const [copied, setCopied] = useState(false);

  // Generate invitation if none exists yet
  useEffect(() => {
    if (existingInvitation) {
      setInvitation(existingInvitation);
      setLoading(false);
      return;
    }

    const initInvite = async () => {
      setLoading(true);
      try {
        const inv = await createCafeInvitation(cafe);
        setInvitation(inv);
      } catch (err) {
        console.error('Error generating invitation:', err);
      } finally {
        setLoading(false);
      }
    };

    initInvite();
  }, [cafe, existingInvitation]);

  const inviteUrl = invitation ? invitation.inviteUrl || getInviteUrl(invitation.token) : '';
  const planConfig = getPlanConfig(cafe.plan);

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateSendEmail = () => {
    alert('Real email dispatch requires SendGrid/Mailgun integration. Please copy the link instead.');
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const inv = await createCafeInvitation(cafe);
      setInvitation(inv);
    } catch (err) {
      console.error('Error regenerating invitation:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl text-stone-100 shadow-2xl overflow-hidden flex flex-col my-6">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-serif">Cafe Owner Invitation</h3>
              <p className="text-xs text-stone-400">
                Send secure onboarding & password setup link for <span className="text-amber-300 font-semibold">{cafe.name}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-100 rounded-xl hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs text-stone-400">Generating secure invitation token...</p>
            </div>
          ) : (
            <>
              {/* Invitation Link Box */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                  Unique Invitation URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      copied
                        ? 'bg-emerald-600 text-stone-100'
                        : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" /> Valid for 14 days
                  </span>
                  <button
                    onClick={handleRegenerate}
                    className="text-stone-400 hover:text-amber-400 flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate Token
                  </button>
                </div>
              </div>

              {/* Email Template Preview Mockup */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Rendered Email Preview
                  </label>
                  <span className="text-[10px] text-stone-500 font-mono">To: {cafe.email}</span>
                </div>

                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-inner text-stone-200">
                  {/* Email Header */}
                  <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs tracking-tight font-serif">CafeFlow Platform</span>
                    </div>
                    <span className="text-[10px] bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-md text-stone-400 font-mono">
                      System Notification
                    </span>
                  </div>

                  {/* Email Body */}
                  <div className="space-y-3 text-xs leading-relaxed text-stone-300">
                    <p className="font-semibold text-stone-100">
                      Hello {cafe.ownerName || 'Cafe Owner'},
                    </p>
                    <p>
                      Your workspace for <strong className="text-amber-300">{cafe.name}</strong> has been created on CafeFlow with the <strong className="text-stone-100">{planConfig.displayName}</strong> plan ({planConfig.maxTables} tables limit).
                    </p>
                    <p>
                      Please click the secure button below to choose your master password and activate your Cafe Dashboard.
                    </p>

                    {/* Email Action CTA */}
                    <div className="py-2 text-center">
                      <a
                        href={inviteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-extrabold text-xs shadow-lg hover:bg-amber-400 transition"
                      >
                        Set Up Password & Access Dashboard <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>

                    <p className="text-[11px] text-stone-500 pt-2 border-t border-stone-800/80">
                      If you did not request this invitation, you can safely ignore this email. This link will expire in 14 days.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={handleSimulateSendEmail}
                  className="flex-1 py-3 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-100 font-bold text-xs flex items-center justify-center gap-2 border border-stone-700 transition"
                >
                  <Send className="w-4 h-4 text-amber-400" />
                  Send Invitation Email
                </button>

                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <ExternalLink className="w-4 h-4" /> Open Invite Link Directly
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
