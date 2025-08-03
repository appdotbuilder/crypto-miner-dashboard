
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletAddressesTable } from '../db/schema';
import { type SaveWalletAddressInput } from '../schema';
import { saveWalletAddress } from '../handlers/save_wallet_address';
import { eq, and } from 'drizzle-orm';

describe('saveWalletAddress', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  const testInput: SaveWalletAddressInput = {
    user_id: 0, // Will be set to testUserId in tests
    crypto_type: 'BITCOIN',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
  };

  it('should create new wallet address', async () => {
    const input = { ...testInput, user_id: testUserId };
    const result = await saveWalletAddress(input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.crypto_type).toEqual('BITCOIN');
    expect(result.address).toEqual('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save wallet address to database', async () => {
    const input = { ...testInput, user_id: testUserId };
    const result = await saveWalletAddress(input);

    const wallets = await db.select()
      .from(walletAddressesTable)
      .where(eq(walletAddressesTable.id, result.id))
      .execute();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].user_id).toEqual(testUserId);
    expect(wallets[0].crypto_type).toEqual('BITCOIN');
    expect(wallets[0].address).toEqual('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(wallets[0].created_at).toBeInstanceOf(Date);
    expect(wallets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update existing wallet address', async () => {
    const input = { ...testInput, user_id: testUserId };
    
    // Create initial wallet address
    const firstResult = await saveWalletAddress(input);
    const firstUpdatedAt = firstResult.updated_at;

    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update with new address
    const updatedInput = {
      ...input,
      address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
    };
    const secondResult = await saveWalletAddress(updatedInput);

    // Should have same ID but updated address and timestamp
    expect(secondResult.id).toEqual(firstResult.id);
    expect(secondResult.user_id).toEqual(testUserId);
    expect(secondResult.crypto_type).toEqual('BITCOIN');
    expect(secondResult.address).toEqual('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
    expect(secondResult.created_at).toEqual(firstResult.created_at);
    expect(secondResult.updated_at.getTime()).toBeGreaterThan(firstUpdatedAt.getTime());

    // Verify only one record exists in database
    const wallets = await db.select()
      .from(walletAddressesTable)
      .where(
        and(
          eq(walletAddressesTable.user_id, testUserId),
          eq(walletAddressesTable.crypto_type, 'BITCOIN')
        )
      )
      .execute();

    expect(wallets).toHaveLength(1);
    expect(wallets[0].address).toEqual('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
  });

  it('should allow different crypto types for same user', async () => {
    const bitcoinInput = { ...testInput, user_id: testUserId };
    const ethereumInput = {
      ...testInput,
      user_id: testUserId,
      crypto_type: 'ETHEREUM_CLASSIC' as const,
      address: '0x742d35Cc6634C0532925a3b8D654De37678A4cC9'
    };

    const bitcoinResult = await saveWalletAddress(bitcoinInput);
    const ethereumResult = await saveWalletAddress(ethereumInput);

    expect(bitcoinResult.id).not.toEqual(ethereumResult.id);
    expect(bitcoinResult.crypto_type).toEqual('BITCOIN');
    expect(ethereumResult.crypto_type).toEqual('ETHEREUM_CLASSIC');

    // Verify both records exist
    const wallets = await db.select()
      .from(walletAddressesTable)
      .where(eq(walletAddressesTable.user_id, testUserId))
      .execute();

    expect(wallets).toHaveLength(2);
  });

  it('should throw error for non-existent user', async () => {
    const input = { ...testInput, user_id: 99999 };

    expect(saveWalletAddress(input)).rejects.toThrow(/User with id 99999 not found/i);
  });
});
