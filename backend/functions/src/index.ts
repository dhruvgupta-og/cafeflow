/**
 * CafeFlow Cloud Functions
 *
 * Exports:
 *  - createCafeAndOwner   (onCall) — platform admin provisions a new cafe + owner account
 *  - addStaffMember       (onCall) — cafe owner adds a staff member to their cafe
 *  - onOrderStatusChange  (onDocumentUpdated) — analytics rollup when an order is paid
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

// Initialize the Firebase Admin SDK (automatically uses application default credentials)
initializeApp();

const adminAuth = getAuth();
const adminDb = getFirestore();

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: generate a secure random password
// ─────────────────────────────────────────────────────────────────────────────
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  let pwd = '';
  for (let i = 0; i < 16; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: assert the caller has platform_admin role in custom claims
// ─────────────────────────────────────────────────────────────────────────────
function assertPlatformAdmin(auth: { token: Record<string, unknown> } | undefined): void {
  if (!auth || auth.token.role !== 'platform_admin') {
    throw new HttpsError(
      'permission-denied',
      'Only platform administrators can call this function.'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: assert the caller is cafe_owner or platform_admin for the given cafeId
// ─────────────────────────────────────────────────────────────────────────────
function assertCafeOwner(
  auth: { token: Record<string, unknown> } | undefined,
  cafeId: string
): void {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const { role, cafeId: tokenCafeId } = auth.token;
  const isAdmin = role === 'platform_admin';
  const isOwner = role === 'cafe_owner' && tokenCafeId === cafeId;
  if (!isAdmin && !isOwner) {
    throw new HttpsError(
      'permission-denied',
      'Only the cafe owner or a platform admin can manage staff for this cafe.'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createCafeAndOwner
//
// Called by the Super Admin UI when provisioning a new cafe tenant.
//
// Input:
//   { cafeName, address, ownerName, ownerEmail, phone, plan }
//
// Actions:
//   1. Creates /cafes/{cafeId} document with provided details
//   2. Creates a Firebase Auth user for the owner (email + temp password)
//   3. Sets custom claims { role: 'cafe_owner', cafeId } on that user
//   4. Creates /users/{uid} profile document
//   5. Returns { cafeId, ownerUid, tempPassword } to the admin client
//
// Security: caller must have role == 'platform_admin' in their custom claims
// ─────────────────────────────────────────────────────────────────────────────
export const createCafeAndOwner = onCall(
  { region: 'us-central1' },
  async (request) => {
    assertPlatformAdmin(request.auth as { token: Record<string, unknown> } | undefined);

    const {
      cafeName,
      address,
      ownerName,
      ownerEmail,
      phone,
      plan = 'Pro',
      logoUrl = '',
    } = request.data as {
      cafeName: string;
      address: string;
      ownerName: string;
      ownerEmail: string;
      phone: string;
      plan?: string;
      logoUrl?: string;
    };

    if (!cafeName || !ownerEmail) {
      throw new HttpsError('invalid-argument', 'cafeName and ownerEmail are required.');
    }

    // Generate a stable cafeId from the cafe name
    const cafeId = `cafe-${cafeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30)}-${Date.now().toString(36)}`;

    const tempPassword = generateTempPassword();
    const now = new Date().toISOString();

    // ── 1. Create Firebase Auth user for the cafe owner ──────────────────────
    let ownerRecord;
    try {
      ownerRecord = await adminAuth.createUser({
        email: ownerEmail,
        password: tempPassword,
        displayName: ownerName,
        emailVerified: false,
      });
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists') {
        ownerRecord = await adminAuth.getUserByEmail(ownerEmail);
      } else {
        throw new HttpsError('internal', `Failed to create Auth user: ${err.message}`);
      }
    }

    const ownerUid = ownerRecord.uid;

    // ── 2. Set custom claims on the owner ────────────────────────────────────
    await adminAuth.setCustomUserClaims(ownerUid, {
      role: 'cafe_owner',
      cafeId,
    });

    // ── 3. Write /cafes/{cafeId} document ────────────────────────────────────
    const cafeData = {
      id: cafeId,
      name: cafeName,
      address: address || '',
      ownerName,
      email: ownerEmail,
      phone: phone || '',
      logoUrl,
      plan,
      status: 'active',
      createdAt: now,
      settings: {
        taxPercent: 8.5,
        serviceChargePercent: 5.0,
        currency: '₹',
        openingHours: '8:00 AM - 10:00 PM',
      },
      stats: {
        totalOrders: 0,
        totalRevenue: 0,
      },
    };
    await adminDb.doc(`cafes/${cafeId}`).set(cafeData);

    // ── 4. Write /users/{uid} profile document ───────────────────────────────
    await adminDb.doc(`users/${ownerUid}`).set({
      uid: ownerUid,
      email: ownerEmail,
      name: ownerName,
      role: 'cafe_owner',
      cafeId,
      createdAt: now,
    });

    return {
      cafeId,
      ownerUid,
      tempPassword, // Admin UI should display this once and instruct owner to change it
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// acceptInvitation
//
// Called by the Cafe Owner via the invite link to set their master password
// and activate their account.
//
// Input:
//   { token, newPassword, ownerName }
//
// Actions:
//   1. Validates the invitation token
//   2. Finds the pre-created Auth user by the invitation's ownerEmail
//   3. Updates the Auth user's password and displayName
//   4. Marks the invitation as accepted in Firestore
// ─────────────────────────────────────────────────────────────────────────────
export const acceptInvitation = onCall(
  { region: 'us-central1' },
  async (request) => {
    const { token, newPassword, ownerName } = request.data as {
      token: string;
      newPassword?: string;
      ownerName?: string;
    };

    if (!token) {
      throw new HttpsError('invalid-argument', 'Invitation token is required.');
    }

    // 1. Retrieve the invitation document
    const inviteRef = adminDb.doc(`invitations/${token}`);
    const inviteSnap = await inviteRef.get();
    
    if (!inviteSnap.exists) {
      throw new HttpsError('not-found', 'Invalid or expired invitation link.');
    }

    const inviteData = inviteSnap.data() as any;

    if (inviteData.status === 'accepted') {
      throw new HttpsError('already-exists', 'This invitation has already been accepted.');
    }

    const isExpired = new Date(inviteData.expiresAt).getTime() < Date.now();
    if (isExpired || inviteData.status === 'expired') {
      throw new HttpsError('failed-precondition', 'This invitation link has expired.');
    }

    const ownerEmail = inviteData.ownerEmail;
    const cafeId = inviteData.cafeId;

    // 2. Update the Auth user
    try {
      const userRecord = await adminAuth.getUserByEmail(ownerEmail);
      
      const updatePayload: any = {};
      if (newPassword) updatePayload.password = newPassword;
      if (ownerName) updatePayload.displayName = ownerName;
      
      if (Object.keys(updatePayload).length > 0) {
        await adminAuth.updateUser(userRecord.uid, updatePayload);
      }
      
      // Double check claims
      const claims = userRecord.customClaims || {};
      if (claims.role !== 'cafe_owner' || claims.cafeId !== cafeId) {
        await adminAuth.setCustomUserClaims(userRecord.uid, {
          ...claims,
          role: 'cafe_owner',
          cafeId,
        });
      }
      
      // Also update the users profile if ownerName changed
      if (ownerName) {
        await adminDb.doc(`users/${userRecord.uid}`).set(
          { name: ownerName },
          { merge: true }
        );
      }
    } catch (err: any) {
      throw new HttpsError('internal', `Failed to update user account: ${err.message}`);
    }

    // 3. Mark invitation as accepted
    const acceptedAt = new Date().toISOString();
    await inviteRef.update({
      status: 'accepted',
      acceptedAt,
    });
    
    // Also update the subcollection mirror if it exists
    const subInviteRef = adminDb.doc(`cafes/${cafeId}/invitations/${token}`);
    try {
      await subInviteRef.update({
        status: 'accepted',
        acceptedAt,
      });
    } catch (e) {
      // Ignore if subcollection doc doesn't exist
    }

    return { success: true };
  }
);


// ─────────────────────────────────────────────────────────────────────────────
// addStaffMember
//
// Called by the Cafe Owner's Settings tab to add a staff member.
//
// Input:
//   { cafeId, staffEmail, staffName, staffRole, permissions }
//
// Actions:
//   1. Validates caller is cafe_owner (or platform_admin) for the given cafeId
//   2. Creates Firebase Auth user for the staff member
//   3. Sets custom claims { role: 'staff', cafeId, permissions }
//   4. Creates /cafes/{cafeId}/staff/{uid} + /users/{uid} documents
//   5. Returns { staffUid, tempPassword }
//
// Security: caller must be cafe_owner of the target cafeId, or platform_admin
// ─────────────────────────────────────────────────────────────────────────────
export const addStaffMember = onCall(
  { region: 'us-central1' },
  async (request) => {
    const {
      cafeId,
      staffEmail,
      staffName,
      staffRole = 'waiter',
      permissions = {
        canManageMenu: false,
        canManageTables: true,
        canViewBilling: false,
        canManageBilling: false,
        canManageStaff: false,
      },
    } = request.data as {
      cafeId: string;
      staffEmail: string;
      staffName: string;
      staffRole?: string;
      permissions?: {
        canManageMenu: boolean;
        canManageTables: boolean;
        canViewBilling: boolean;
        canManageBilling: boolean;
        canManageStaff: boolean;
      };
    };

    assertCafeOwner(request.auth as { token: Record<string, unknown> } | undefined, cafeId);

    if (!cafeId || !staffEmail) {
      throw new HttpsError('invalid-argument', 'cafeId and staffEmail are required.');
    }

    const tempPassword = generateTempPassword();
    const now = new Date().toISOString();

    // ── 1. Create Firebase Auth user for the staff member ────────────────────
    let staffRecord;
    try {
      staffRecord = await adminAuth.createUser({
        email: staffEmail,
        password: tempPassword,
        displayName: staffName,
        emailVerified: false,
      });
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists') {
        staffRecord = await adminAuth.getUserByEmail(staffEmail);
      } else {
        throw new HttpsError('internal', `Failed to create staff Auth user: ${err.message}`);
      }
    }

    const staffUid = staffRecord.uid;

    // ── 2. Set custom claims on the staff user ───────────────────────────────
    await adminAuth.setCustomUserClaims(staffUid, {
      role: 'staff',
      cafeId,
      permissions,
    });

    // ── 3. Write /cafes/{cafeId}/staff/{uid} document ────────────────────────
    const staffData = {
      uid: staffUid,
      name: staffName,
      email: staffEmail,
      role: staffRole,
      cafeId,
      permissions,
      createdAt: now,
    };
    await adminDb.doc(`cafes/${cafeId}/staff/${staffUid}`).set(staffData);

    // ── 4. Write /users/{uid} profile document ───────────────────────────────
    await adminDb.doc(`users/${staffUid}`).set({
      uid: staffUid,
      email: staffEmail,
      name: staffName,
      role: 'staff',
      cafeId,
      permissions,
      createdAt: now,
    });

    return {
      staffUid,
      tempPassword,
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// onOrderStatusChange — Analytics Rollup
//
// Triggers on every update to /cafes/{cafeId}/orders/{orderId}.
// When an order's status transitions to 'Completed' (paid/settled):
//   - Atomically increments /cafes/{cafeId}.stats.totalOrders and .totalRevenue
//   - Atomically increments /platformStats/summary.totalOrders and .totalRevenue
//
// Uses FieldValue.increment() so concurrent updates are safe (no read-modify-write).
// The admin SDK bypasses Firestore rules, so /platformStats writes succeed even
// though the rules deny client writes there.
// ─────────────────────────────────────────────────────────────────────────────
export const onOrderStatusChange = onDocumentUpdated(
  {
    document: 'cafes/{cafeId}/orders/{orderId}',
    region: 'us-central1',
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    const wasPreviouslyPaid = before.status === 'Completed';
    const isNowPaid = after.status === 'Completed';

    // Only trigger on the exact transition → 'Completed' (not on re-updates)
    if (wasPreviouslyPaid || !isNowPaid) return;

    const { cafeId } = event.params;
    const orderTotal: number = after.total || after.subtotal || 0;

    // ── Increment per-cafe stats ──────────────────────────────────────────────
    await adminDb.doc(`cafes/${cafeId}`).update({
      'stats.totalOrders': FieldValue.increment(1),
      'stats.totalRevenue': FieldValue.increment(orderTotal),
      'stats.lastActive': new Date().toISOString(),
    });

    // ── Increment platform-wide stats ─────────────────────────────────────────
    await adminDb.doc('platformStats/summary').set(
      {
        totalOrders: FieldValue.increment(1),
        totalRevenue: FieldValue.increment(orderTotal),
        lastUpdated: new Date().toISOString(),
      },
      { merge: true } // Create the doc if it doesn't exist yet
    );
  }
);
