
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, balancesTable, transactionsTable } from '../db/schema';
import { type SwapCryptoInput } from '../schema';
import { swapCrypto } from '../handlers/swap_crypto';
import { eq, and } from 'drizzle-orm';

const testInput: SwapCryptoInput = {
  user_id: 1,
  from_crypto: 'BITCOIN',
  to_crypto: 'ETHEREUM_CLASSIC',
  amount: 50.0
};

describe('swapCrypto', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should swap crypto successfully', async () => {
    // Create test user
    await db.insert(usersTable).values({}).execute();

    // Create initial balance for from_crypto
    await db.insert(balancesTable)
      .values({
        user_id: 1,
        crypto_type: 'BITCOIN',
        amount: '100.0'
      })
      .execute();

    const result = await swapCrypto(testInput);

    // Should return 2 transactions
    expect(result).toHaveLength(2);

    // Verify SWAP_FROM transaction
    const swapFromTx = result.find(tx => tx.transaction_type === 'SWAP_FROM');
    expect(swapFromTx).toBeDefined();
    expect(swapFromTx!.user_id).toEqual(1);
    expect(swapFromTx!.crypto_type).toEqual('BITCOIN');
    expect(swapFromTx!.amount).toEqual(50.0);
    expect(swapFromTx!.from_crypto_type).toEqual('BITCOIN');
    expect(swapFromTx!.to_crypto_type).toEqual('ETHEREUM_CLASSIC');

    // Verify SWAP_TO transaction
    const swapToTx = result.find(tx => tx.transaction_type === 'SWAP_TO');
    expect(swapToTx).toBeDefined();
    expect(swapToTx!.user_id).toEqual(1);
    expect(swapToTx!.crypto_type).toEqual('ETHEREUM_CLASSIC');
    expect(swapToTx!.amount).toEqual(50.0);
    expect(swapToTx!.from_crypto_type).toEqual('BITCOIN');
    expect(swapToTx!.to_crypto_type).toEqual('ETHEREUM_CLASSIC');
  });

  it('should update balances correctly', async () => {
    // Create test user
    await db.insert(usersTable).values({}).execute();

    // Create initial balance for from_crypto
    await db.insert(balancesTable)
      .values({
        user_id: 1,
        crypto_type: 'BITCOIN',
        amount: '100.0'
      })
      .execute();

    await swapCrypto(testInput);

    // Check from_crypto balance was deducted
    const fromBalance = await db.select()
      .from(balancesTable)
      .where(
        and(
          eq(balancesTable.user_id, 1),
          eq(balancesTable.crypto_type, 'BITCOIN')
        )
      )
      .execute();

    expect(fromBalance).toHaveLength(1);
    expect(parseFloat(fromBalance[0].amount)).toEqual(50.0);

    // Check to_crypto balance was created
    const toBalance = await db.select()
      .from(balancesTable)
      .where(
        and(
          eq(balancesTable.user_id, 1),
          eq(balancesTable.crypto_type, 'ETHEREUM_CLASSIC')
        )
      )
      .execute();

    expect(toBalance).toHaveLength(1);
    expect(parseFloat(toBalance[0].amount)).toEqual(50.0);
  });

  it('should update existing to_crypto balance', async () => {
    // Create test user
    await db.insert(usersTable).values({}).execute();

    // Create initial balances for both cryptos
    await db.insert(balancesTable)
      .values([
        {
          user_id: 1,
          crypto_type: 'BITCOIN',
          amount: '100.0'
        },
        {
          user_id: 1,
          crypto_type: 'ETHEREUM_CLASSIC',
          amount: '25.0'
        }
      ])
      .execute();

    await swapCrypto(testInput);

    // Check to_crypto balance was updated (not created)
    const toBalance = await db.select()
      .from(balancesTable)
      .where(
        and(
          eq(balancesTable.user_id, 1),
          eq(balancesTable.crypto_type, 'ETHEREUM_CLASSIC')
        )
      )
      .execute();

    expect(toBalance).toHaveLength(1);
    expect(parseFloat(toBalance[0].amount)).toEqual(75.0); // 25 + 50
  });

  it('should create transaction records in database', async () => {
    // Create test user
    await db.insert(usersTable).values({}).execute();

    // Create initial balance
    await db.insert(balancesTable)
      .values({
        user_id: 1,
        crypto_type: 'BITCOIN',
        amount: '100.0'
      })
      .execute();

    await swapCrypto(testInput);

    // Check transactions were saved to database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, 1))
      .execute();

    expect(transactions).toHaveLength(2);

    const swapFromTx = transactions.find(tx => tx.transaction_type === 'SWAP_FROM');
    const swapToTx = transactions.find(tx => tx.transaction_type === 'SWAP_TO');

    expect(swapFromTx).toBeDefined();
    expect(swapToTx).toBeDefined();
    
    expect(parseFloat(swapFromTx!.amount)).toEqual(50.0);
    expect(parseFloat(swapToTx!.amount)).toEqual(50.0);
  });

  it('should throw error for insufficient balance', async () => {
    // Create test user
    await db.insert(usersTable).values({}).execute();

    // Create balance with insufficient amount
    await db.insert(balancesTable)
      .values({
        user_id: 1,
        crypto_type: 'BITCOIN',
        amount: '25.0' // Less than required 50.0
      })
      .execute();

    await expect(swapCrypto(testInput)).rejects.toThrow(/insufficient balance/i);
  });

  it('should throw error for non-existent balance', async () => {
    // Create test user but no balance
    await db.insert(usersTable).values({}).execute();

    await expect(swapCrypto(testInput)).rejects.toThrow(/no balance found/i);
  });
});
