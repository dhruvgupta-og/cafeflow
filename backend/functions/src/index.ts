/**
 * CafeFlow Cloud Functions
 *
 * Exports:
 *  - createCafeAndOwner   (onCall) — platform admin provisions a new cafe + owner account
 *  - createInvitation     (onCall) — create invite links securely via backend
 *  - acceptInvitation     (onCall) — accept an invite and provision account securely
 *  - placeOrder           (onCall) — securely place an order with server-side price validation
 *  - onOrderStatusChange  (onDocumentUpdated) — analytics rollup when an order is paid
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth, UserRecord } from 'firebase-admin/auth';
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
// createInvitation
//
// Generates an invitation securely via the backend, enforcing that only
// authorized users (platform admins, or owners of that specific cafe) can do so.
//
// Input:
//   { cafeId, cafeName, targetEmail, targetName, invitedRole, plan, permissions }
// ─────────────────────────────────────────────────────────────────────────────
export const createInvitation = onCall(
  { region: 'us-central1' },
  async (request) => {
    const {
      cafeId,
      cafeName,
      targetEmail,
      targetName,
      invitedRole,
      plan = 'Pro',
      permissions,
    } = request.data as {
      cafeId: string;
      cafeName: string;
      targetEmail: string;
      targetName: string;
      invitedRole: 'cafe_owner' | 'staff';
      plan?: string;
      permissions?: any;
    };

    if (!cafeId || !targetEmail || !invitedRole) {
      throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    const auth = request.auth as { token: Record<string, unknown> } | undefined;
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const isPlatformAdmin = auth.token.role === 'platform_admin';
    const isOwnerOfCafe = auth.token.role === 'cafe_owner' && auth.token.cafeId === cafeId;

    if (invitedRole === 'cafe_owner' && !isPlatformAdmin) {
      throw new HttpsError('permission-denied', 'Only platform admins can invite cafe owners.');
    }

    if (!isPlatformAdmin && !isOwnerOfCafe) {
      throw new HttpsError('permission-denied', 'Not authorized to invite to this cafe.');
    }

    if (invitedRole === 'staff' && !permissions) {
      throw new HttpsError('invalid-argument', 'Staff invitations require a permissions object.');
    }

    const randomPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const token = `inv_${cafeId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}_${randomPart}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const invitationData = {
      id: token,
      token,
      cafeId,
      cafeName,
      ownerEmail: targetEmail,
      ownerName: targetName || 'New User',
      role: invitedRole,
      plan,
      permissions: invitedRole === 'staff' ? permissions : null,
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt,
    };

    await adminDb.doc(`invitations/${token}`).set(invitationData);
    await adminDb.doc(`cafes/${cafeId}/invitations/${token}`).set(invitationData);

    // Provide the URL format for the client
    return {
      token,
      inviteUrl: `/invite/${token}` // Note: The client prepends window.location.origin
    };
  }
);

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
      currency = '₹',
      taxPercent = 8.5,
      serviceChargePercent = 5.0,
      openingHours = '8:00 AM - 10:00 PM',
    } = request.data as {
      cafeName: string;
      address: string;
      ownerName: string;
      ownerEmail: string;
      phone: string;
      plan?: string;
      logoUrl?: string;
      currency?: string;
      taxPercent?: number;
      serviceChargePercent?: number;
      openingHours?: string;
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
        taxPercent,
        serviceChargePercent,
        currency,
        openingHours,
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
    const role = inviteData.role || 'cafe_owner';
    const permissions = inviteData.permissions;
    const now = new Date().toISOString();

    // 2. Create or Update the Auth user
    let userRecord: UserRecord;
    try {
      try {
        userRecord = await adminAuth.getUserByEmail(ownerEmail);
        const updatePayload: any = {};
        if (newPassword) updatePayload.password = newPassword;
        if (ownerName) updatePayload.displayName = ownerName;
        if (Object.keys(updatePayload).length > 0) {
          userRecord = await adminAuth.updateUser(userRecord.uid, updatePayload);
        }
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          userRecord = await adminAuth.createUser({
            email: ownerEmail,
            password: newPassword,
            displayName: ownerName,
            emailVerified: false,
          });
        } else {
          throw e;
        }
      }
      
      const claimsPayload: any = {
        role,
        cafeId,
      };
      if (role === 'staff' && permissions) {
        claimsPayload.permissions = permissions;
      }
      
      await adminAuth.setCustomUserClaims(userRecord.uid, claimsPayload);
      
      // Update users profile
      await adminDb.doc(`users/${userRecord.uid}`).set(
        { 
          uid: userRecord.uid,
          email: ownerEmail,
          name: ownerName || userRecord.displayName || '',
          role,
          cafeId,
          permissions: role === 'staff' ? permissions : null,
          createdAt: now
        },
        { merge: true }
      );

      if (role === 'staff') {
        const staffData = {
          uid: userRecord.uid,
          name: ownerName || userRecord.displayName || '',
          email: ownerEmail,
          role: 'waiter', // Default UI representation or passed via invite? Let's just use 'staff' or 'waiter'
          cafeId,
          permissions,
          createdAt: now,
        };
        await adminDb.doc(`cafes/${cafeId}/staff/${userRecord.uid}`).set(staffData);
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
// placeOrder
//
// Securely places an order for a customer. Unauthenticated access is allowed
// because customers scan a QR code and don't necessarily sign in.
// Prices and totals are computed SERVER-SIDE to prevent tampering.
// ─────────────────────────────────────────────────────────────────────────────
export const placeOrder = onCall(
  { region: 'us-central1' },
  async (request) => {
    const {
      cafeId,
      tableId,
      items,
      customerName = 'Guest',
      customerPhone = '',
    } = request.data as {
      cafeId: string;
      tableId: string;
      items: Array<{
        itemId: string;
        categoryId: string;
        qty: number;
        notes?: string;
        addOns?: Array<{ name: string }>;
      }>;
      customerName?: string;
      customerPhone?: string;
    };

    if (!cafeId || !tableId || !items || items.length === 0) {
      throw new HttpsError('invalid-argument', 'Missing cafeId, tableId, or items.');
    }

    // 1. Fetch cafe settings to compute tax and service charge
    const cafeSnap = await adminDb.doc(`cafes/${cafeId}`).get();
    if (!cafeSnap.exists) {
      throw new HttpsError('not-found', 'Cafe not found.');
    }
    const cafeData = cafeSnap.data() as any;
    const settings = cafeData.settings || {};
    const taxPercent = settings.taxPercent || 0;
    const serviceChargePercent = settings.serviceChargePercent || 0;

    let subtotal = 0;
    const validatedItems = [];

    // 2. Validate items and compute subtotal
    for (const item of items) {
      if (item.qty <= 0) {
        throw new HttpsError('invalid-argument', 'Invalid item quantity.');
      }

      const itemRef = adminDb.doc(`cafes/${cafeId}/menuCategories/${item.categoryId}/items/${item.itemId}`);
      const itemSnap = await itemRef.get();
      
      if (!itemSnap.exists) {
        throw new HttpsError('invalid-argument', `Item ${item.itemId} not found.`);
      }

      const realItem = itemSnap.data() as any;

      if (!realItem.isAvailable) {
        throw new HttpsError('failed-precondition', `Item ${realItem.name} is currently unavailable.`);
      }

      let itemTotal = realItem.price * item.qty;
      const validatedAddOns = [];

      // Validate add-ons
      if (item.addOns && item.addOns.length > 0) {
        const availableAddOns = realItem.addOns || [];
        for (const requestedAddOn of item.addOns) {
          const matchingAddOn = availableAddOns.find((a: any) => a.name === requestedAddOn.name);
          if (!matchingAddOn) {
            throw new HttpsError('invalid-argument', `Add-on ${requestedAddOn.name} is not available for this item.`);
          }
          itemTotal += matchingAddOn.price * item.qty;
          validatedAddOns.push({ name: matchingAddOn.name, price: matchingAddOn.price });
        }
      }

      subtotal += itemTotal;
      validatedItems.push({
        id: item.itemId,
        categoryId: item.categoryId,
        name: realItem.name,
        price: realItem.price,
        qty: item.qty,
        notes: item.notes || '',
        addOns: validatedAddOns
      });
    }

    // 3. Compute final totals
    const tax = Number(((subtotal * taxPercent) / 100).toFixed(2));
    const serviceCharge = Number(((subtotal * serviceChargePercent) / 100).toFixed(2));
    const total = Number((subtotal + tax + serviceCharge).toFixed(2));

    // 4. Write order document
    const now = new Date().toISOString();
    const newOrderRef = adminDb.collection(`cafes/${cafeId}/orders`).doc();
    const orderData = {
      id: newOrderRef.id,
      tableId,
      customerName,
      customerPhone,
      items: validatedItems,
      subtotal,
      tax,
      serviceCharge,
      total,
      status: 'New',
      createdAt: now,
      updatedAt: now,
    };

    await newOrderRef.set(orderData);

    // 5. Mark the table occupied — done here server-side so the anonymous customer
    //    never needs write access to the tables collection.
    if (tableId && tableId !== 'Walk-in') {
      await adminDb.doc(`cafes/${cafeId}/tables/${tableId}`).set(
        { status: 'occupied' },
        { merge: true }
      );
    }

    return { orderId: newOrderRef.id };
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
