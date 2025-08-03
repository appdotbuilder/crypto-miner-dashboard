
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletAddressesTable } from '../db/schema';
import { type GetUserWalletAddressesInput } from '../schema';
import { getUserWalletAddresses } from '../handlers/get_user_wallet_addresses';

const testInput: GetUserWalletAddressesInput = {
  user_id: 1
};

describe('getUserWalletAddresses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no wallet addresses', async () => {
    // Create user
    await db.insert(usersTable).values({}).execute();

    const result = await getUserWalletAddresses(testInput);

    expect(result).toEqual([]);
  });

  it('should return wallet addresses for user', async () => {
    // Create user
    await db.insert(usersTable).values({}).execute();

    // Create wallet addresses
    await db.insert(walletAddressesTable).values([
      {
        user_id: 1,
        crypto_type: 'BITCOIN',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      },
      {
        user_id: 1,
        crypto_type: 'ETHEREUM_CLASSIC',
        address: '0x742d35Cc6634C0532925a3b8D7d2dDc4d3c8b1DB'
      }
    ]).execute();

    const result = await getUserWalletAddresses(testInput);

    expect(result).toHaveLength(2);
    
    const bitcoinAddress = result.find(addr => addr.crypto_type === 'BITCOIN');
    expect(bitcoinAddress).toBeDefined();
    expect(bitcoinAddress!.address).toEqual('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(bitcoinAddress!.user_id).toEqual(1);
    expect(bitcoinAddress!.id).toBeDefined();
    expect(bitcoinAddress!.created_at).toBeInstanceOf(Date);
    expect(bitcoinAddress!.updated_at).toBeInstanceOf(Date);

    const ethAddress = result.find(addr => addr.crypto_type === 'ETHEREUM_CLASSIC');
    expect(ethAddress).toBeDefined();
    expect(ethAddress!.address).toEqual('0x742d35Cc6634C0532925a3b8D7d2dDc4d3c8b1DB');
    expect(ethAddress!.user_id).toEqual(1);
  });

  it('should only return addresses for specified user', async () => {
    // Create two users
    await db.insert(usersTable).values([{}, {}]).execute();

    // Create wallet addresses for both users
    await db.insert(walletAddressesTable).values([
      {
        user_id: 1,
        crypto_type: 'BITCOIN',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      },
      {
        user_id: 2,
        crypto_type: 'BITCOIN',
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'
      }
    ]).execute();

    const result = await getUserWalletAddresses(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(1);
    expect(result[0].address).toEqual('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  });

  it('should return multiple addresses for same crypto type', async () => {
    // Create user
    await db.insert(usersTable).values({}).execute();

    // Create multiple Bitcoin addresses
    await db.insert(walletAddressesTable).values([
      {
        user_id: 1,
        crypto_type: 'BITCOIN',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      },
      {
        user_id: 1,
        crypto_type: 'BITCOIN',
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'
      }
    ]).execute();

    const result = await getUserWalletAddresses(testInput);

    expect(result).toHaveLength(2);
    expect(result.every(addr => addr.crypto_type === 'BITCOIN')).toBe(true);
    expect(result.every(addr => addr.user_id === 1)).toBe(true);
    
    const addresses = result.map(addr => addr.address);
    expect(addresses).toContain('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(addresses).toContain('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
  });
});
