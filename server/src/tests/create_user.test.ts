
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, balancesTable } from '../db/schema';
import { type CreateUserInput, cryptoTypeSchema } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

const testInput: CreateUserInput = {};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].id).toEqual(result.id);
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should initialize balances for all crypto types', async () => {
    const result = await createUser(testInput);

    const balances = await db.select()
      .from(balancesTable)
      .where(eq(balancesTable.user_id, result.id))
      .execute();

    const cryptoTypes = cryptoTypeSchema.options;
    expect(balances).toHaveLength(cryptoTypes.length);

    // Check that all crypto types are initialized with 0 balance
    const balanceCryptoTypes = balances.map(b => b.crypto_type).sort();
    const expectedCryptoTypes = cryptoTypes.slice().sort();
    expect(balanceCryptoTypes).toEqual(expectedCryptoTypes);

    // Verify all balances are initialized to 0
    balances.forEach(balance => {
      expect(parseFloat(balance.amount)).toEqual(0);
      expect(balance.user_id).toEqual(result.id);
      expect(balance.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should create multiple users with separate balances', async () => {
    const user1 = await createUser(testInput);
    const user2 = await createUser(testInput);

    expect(user1.id).not.toEqual(user2.id);

    // Check user1 balances
    const user1Balances = await db.select()
      .from(balancesTable)
      .where(eq(balancesTable.user_id, user1.id))
      .execute();

    // Check user2 balances
    const user2Balances = await db.select()
      .from(balancesTable)
      .where(eq(balancesTable.user_id, user2.id))
      .execute();

    const cryptoTypesCount = cryptoTypeSchema.options.length;
    expect(user1Balances).toHaveLength(cryptoTypesCount);
    expect(user2Balances).toHaveLength(cryptoTypesCount);

    // Ensure balances are separate for each user
    user1Balances.forEach(balance => {
      expect(balance.user_id).toEqual(user1.id);
    });

    user2Balances.forEach(balance => {
      expect(balance.user_id).toEqual(user2.id);
    });
  });
});
