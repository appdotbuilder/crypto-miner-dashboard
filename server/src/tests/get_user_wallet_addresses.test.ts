
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletAddressesTable } from '../db/schema';
import { type GetUserWalletAddressesInput } from '../schema';
import { getUserWalletAddresses } from '../handlers/get_user_wallet_addresses';

describe('getUserWalletAddresses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([{}, {}])
      .returning()
      .execute();
    
    testUserId = users[0].id;
    otherUserId = users[1].id;
  });

  it('should return all wallet addresses for a user', async () => {
    // Create test wallet addresses for the user
    await db.insert(walletAddressesTable)
      .values([
        {
          user_id: testUserId,
          crypto_type: 'BITCOIN',
          address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
        },
        {
          user_id: testUserId,
          crypto_type: 'ETHEREUM_CLASSIC',
          address: '0x742d35cc6861c4532d71b4c76c95b4e4f2c2e6c6'
        },
        {
          user_id: testUserId,
          crypto_type: 'SOLANA',
          address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
        }
      ])
      .execute();

    // Create wallet address for other user (should not be returned)
    await db.insert(walletAddressesTable)
      .values({
        user_id: otherUserId,
        crypto_type: 'BITCOIN',
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'
      })
      .execute();

    const input: GetUserWalletAddressesInput = {
      user_id: testUserId
    };

    const result = await getUserWalletAddresses(input);

    // Should return exactly 3 addresses for the test user
    expect(result).toHaveLength(3);

    // Verify all addresses belong to the correct user
    result.forEach(address => {
      expect(address.user_id).toEqual(testUserId);
      expect(address.id).toBeDefined();
      expect(address.crypto_type).toBeDefined();
      expect(address.address).toBeDefined();
      expect(address.created_at).toBeInstanceOf(Date);
      expect(address.updated_at).toBeInstanceOf(Date);
    });

    // Verify specific crypto types are present
    const cryptoTypes = result.map(addr => addr.crypto_type);
    expect(cryptoTypes).toContain('BITCOIN');
    expect(cryptoTypes).toContain('ETHEREUM_CLASSIC');
    expect(cryptoTypes).toContain('SOLANA');
  });

  it('should return empty array when user has no wallet addresses', async () => {
    const input: GetUserWalletAddressesInput = {
      user_id: testUserId
    };

    const result = await getUserWalletAddresses(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetUserWalletAddressesInput = {
      user_id: 99999 // Non-existent user ID
    };

    const result = await getUserWalletAddresses(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return addresses for the specified user', async () => {
    // Create wallet addresses for both users
    await db.insert(walletAddressesTable)
      .values([
        {
          user_id: testUserId,
          crypto_type: 'BITCOIN',
          address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
        },
        {
          user_id: otherUserId,
          crypto_type: 'BITCOIN',
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'
        },
        {
          user_id: otherUserId,
          crypto_type: 'ETHEREUM_CLASSIC',
          address: '0x742d35cc6861c4532d71b4c76c95b4e4f2c2e6c6'
        }
      ])
      .execute();

    const input: GetUserWalletAddressesInput = {
      user_id: testUserId
    };

    const result = await getUserWalletAddresses(input);

    // Should only return addresses for testUserId
    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(testUserId);
    expect(result[0].crypto_type).toEqual('BITCOIN');
    expect(result[0].address).toEqual('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  });
});
