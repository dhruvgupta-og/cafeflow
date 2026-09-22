import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { Cafe, CafePlan, Invitation } from '../types';

/**
 * Generate a unique, secure invitation token
 */
export const generateInviteToken = (cafeId: string): string => {
  const randomPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  return `inv_${cafeId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}_${randomPart}`;
};

/**
 * Build the browser invitation link
 */
export const getInviteUrl = (token: string): string => {
  const origin = window.location.origin;
  return `${origin}/invite/${token}`;
};

/**
 * Create and persist a new invitation via Cloud Function securely
 */
export const createCafeInvitation = async (
  cafe: Pick<Cafe, 'id' | 'name' | 'email' | 'ownerName' | 'plan'>,
  invitedRole: 'cafe_owner' | 'staff' = 'cafe_owner',
  permissions?: any
): Promise<{ id: string, token: string, inviteUrl: string }> => {
  const createInviteFn = httpsCallable(functions, 'createInvitation');
  const result = await createInviteFn({
    cafeId: cafe.id,
    cafeName: cafe.name,
    targetEmail: cafe.email,
    targetName: cafe.ownerName || 'New User',
    invitedRole,
    plan: cafe.plan || 'Pro',
    permissions,
  });

  const data = result.data as any;
  return {
    id: data.token,
    token: data.token,
    inviteUrl: `${window.location.origin}${data.inviteUrl}`
  };
};

/**
 * Retrieve and validate an invitation by token
 */
export const getInvitationByToken = async (token: string): Promise<{
  invitation: Invitation | null;
  isValid: boolean;
  error?: string;
}> => {
  try {
    const docSnap = await getDoc(doc(db, 'invitations', token));
    if (!docSnap.exists()) {
      return { invitation: null, isValid: false, error: 'Invitation link not found or invalid.' };
    }

    const invitation = { id: docSnap.id, ...docSnap.data() } as Invitation;

    if (invitation.status === 'accepted') {
      return { invitation, isValid: false, error: 'This invitation has already been accepted.' };
    }

    const isExpired = new Date(invitation.expiresAt).getTime() < Date.now();
    if (isExpired || invitation.status === 'expired') {
      return { invitation, isValid: false, error: 'This invitation link has expired. Please contact your Super Admin.' };
    }

    return { invitation, isValid: true };
  } catch (err: any) {
    console.error('Error fetching invitation:', err);
    return { invitation: null, isValid: false, error: err.message || 'Failed to load invitation.' };
  }
};

