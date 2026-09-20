import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
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
 * Create and persist a new invitation in Firestore
 */
export const createCafeInvitation = async (
  cafe: Pick<Cafe, 'id' | 'name' | 'email' | 'ownerName' | 'plan'>
): Promise<Invitation> => {
  const token = generateInviteToken(cafe.id);
  const now = new Date();
  // Invitation expires in 14 days
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const invitation: Invitation = {
    id: token,
    token,
    cafeId: cafe.id,
    cafeName: cafe.name,
    ownerEmail: cafe.email,
    ownerName: cafe.ownerName || 'Cafe Owner',
    plan: cafe.plan || 'Pro',
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt
  };

  // Write to both root invitations collection and subcollection for ease of retrieval
  await setDoc(doc(db, 'invitations', token), invitation);
  await setDoc(doc(db, `cafes/${cafe.id}/invitations`, token), invitation);

  return invitation;
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

/**
 * Mark invitation as accepted
 */
export const markInvitationAccepted = async (token: string, cafeId: string): Promise<void> => {
  const acceptedAt = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'invitations', token), {
      status: 'accepted',
      acceptedAt
    });
    await updateDoc(doc(db, `cafes/${cafeId}/invitations`, token), {
      status: 'accepted',
      acceptedAt
    });
  } catch (err) {
    console.error('Error marking invitation accepted:', err);
  }
};
