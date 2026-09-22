import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Initialize the test environment, pointing to the local emulator
  testEnv = await initializeTestEnvironment({
    projectId: 'cafeflow-872b9-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('CafeFlow Firestore Security Rules', () => {
  
  describe('/platformAdmins', () => {
    it('denies read to unauthenticated user', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(db.collection('platformAdmins').doc('admin123').get());
    });

    it('denies read to regular cafe staff', async () => {
      const db = testEnv.authenticatedContext('staff123', { role: 'staff', cafeId: 'cafe-abc' }).firestore();
      await assertFails(db.collection('platformAdmins').doc('admin123').get());
    });

    it('allows read to platform_admin', async () => {
      const db = testEnv.authenticatedContext('admin123', { role: 'platform_admin' }).firestore();
      await assertSucceeds(db.collection('platformAdmins').doc('admin123').get());
    });

    it('denies write even to platform_admin (must use Admin SDK)', async () => {
      const db = testEnv.authenticatedContext('admin123', { role: 'platform_admin' }).firestore();
      await assertFails(db.collection('platformAdmins').doc('admin999').set({ email: 'x@x.com' }));
    });
  });

  describe('/cafes/{cafeId}', () => {
    it('allows public read', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertSucceeds(db.collection('cafes').doc('cafe-123').get());
    });

    it('denies write to unauthenticated user', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(db.collection('cafes').doc('cafe-123').set({ name: 'Cafe X' }));
    });
  });

  describe('/cafes/{cafeId}/bills', () => {
    it('denies read to unauthenticated user', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(db.collection('cafes').doc('cafe-abc').collection('bills').get());
    });

    it('denies read to staff of a DIFFERENT cafe', async () => {
      const db = testEnv.authenticatedContext('staff123', { role: 'staff', cafeId: 'cafe-xyz' }).firestore();
      await assertFails(db.collection('cafes').doc('cafe-abc').collection('bills').get());
    });

    it('allows read to staff of the SAME cafe', async () => {
      const db = testEnv.authenticatedContext('staff123', { role: 'staff', cafeId: 'cafe-abc' }).firestore();
      await assertSucceeds(db.collection('cafes').doc('cafe-abc').collection('bills').get());
    });
  });

  describe('/cafes/{cafeId}/orders', () => {
    it('allows anonymous CREATE order with valid fields', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertSucceeds(
        db.collection('cafes').doc('cafe-abc').collection('orders').add({
          status: 'New',
          items: [{ name: 'Coffee', qty: 1 }],
          tableId: 'T1'
        })
      );
    });

    it('denies anonymous CREATE order with invalid status', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        db.collection('cafes').doc('cafe-abc').collection('orders').add({
          status: 'Accepted', // must be "New"
          items: [{ name: 'Coffee', qty: 1 }],
          tableId: 'T1'
        })
      );
    });

    it('denies anonymous list /cafes/{cafeId}/orders', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(db.collection('cafes').doc('cafe-abc').collection('orders').get());
    });

    it('allows staff to update an order', async () => {
      const dbStaff = testEnv.authenticatedContext('staff1', { role: 'staff', cafeId: 'cafe-abc' }).firestore();
      // Setup doc using admin bypass
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('cafes').doc('cafe-abc').collection('orders').doc('order1').set({
          status: 'New',
          tableId: 'T1'
        });
      });

      await assertSucceeds(
        dbStaff.collection('cafes').doc('cafe-abc').collection('orders').doc('order1').update({
          status: 'Accepted'
        })
      );
    });
  });
});
