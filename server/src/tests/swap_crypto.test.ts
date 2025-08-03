
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
  amount: 0.5
};

describe('swapCrypto', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should swap crypto successfully', async () => {
    // Create test user
    await db.insert(usersTable).values({}).execute();

    // Create initial balance
    await db.insert(balancesTable).values({
      user_id: 1,
      crypto_type: 'BITCOIN',
      amount: '1.0',
      updated_at: new Date()
    }).execute();

    const result = await swapCrypto(testInput);

    // Should return two transactions
    expect(result).toHaveLength(2);

    // Check SWAP_FROM transaction
    const swapFromTx = result.find(tx => tx.transaction_type === 'SWAP_FROM');
    expect(swapFromTx).toBeDefined();
    expect(swapFromTx!.crypto_type).toEqual('BITCOIN');
    expect(swapFromTx!.amount).toEqual(0.5);
    expect(swapFromTx!.from_crypto_type).toEqual('BITCOIN');
    expect(swapFromTx!.to_crypto_type).toEqual('ETHEREUM_CLASSIC');

    // Check SWAP_TO transaction
    const swapToTx = result.find(tx => tx.transaction_type === 'SWAP_TO');
    expect(swapToTx).toBeDefined();
    expect(swapToTx!.crypto_type).toEqual('ETHEREUM_CLASSIC');
    expect(swapToTx!.amount).toEqual(0.5);
    expect(swapToTx!.from_crypto_type).toEqual('BITCOIN');
    expect(swapToTx!.to_crypto_type).toEqual('ETHEREUM_CLASSIC');
  });

  it('should update balances correctly', async () => {
    // Create test user
    await db.insert(usersTable).values({}).execute();

    // Create initial balance
    await db.insert(balancesTable).values({
      user_id: 1,
      crypto_type: 'BITCOIN',
      amount: '2.0',
      updated_at: new Date()
    }).execute();

    await swapCrypto(testInput);

    // Check from_crypto balance was reduced
    const fromBalance = await db.select()
      .from(balancesTable)
      .where(and(
        eq(balancesTable.user_id, 1),
        eq(balancesTable.crypto_type, 'BITCOIN')
      ))
      .execute();

    expect(fromBalance).toHaveLength(1);
    expect(parseFloat(fromBalance[0].amount)).toEqual(1.5);

    // Check to_crypto balance was created
    const toBalance = await db.select()
      .from(balancesTable)
      .where(and(
        eq(balancesTable.user_id, 1),
        eq(balancesTable.crypto_type, 'ETHEREUM_CLASSIC')
      ))
      .execute();

    expect(toBalance).toHaveLength(1);
    expect(parseFloat(toBalance[0].amount)).toEqual(0.5);
  });

  it('should add to existing to_crypto balance', async () => {
    // Create test user
    await db.insert(usersTable).values({}).execute();

    // Create initial balances for both cryptos
    await db.insert(balancesTable).values([
      {
        user_id: 1,
        crypto_type: 'BITCOIN',
        amount: '1.0',
        updated_at: new Date()
      },
      {
        user_id: 1,
        crypto_type: 'ETHEREUM_CLASSIC',
        amount: '2.0',
        updated_at: new Date()
      }
    ]).execute();

    await swapCrypto(testInput);

    // Check to_crypto balance was increased
    const toBalance = await db.select()
      .from(balancesTable)
      .where(and(
        eq(balancesTable.user_id, 1),
        eq(balancesTable.crypto_type, 'ETHEREUM_CLASSIC')
      ))
      .execute();

    expect(toBalance).toHaveLength(1);
    expect(parseFloat(toBalance[0].amount)).toEqual(2.5); // 2.0 + 0.5
  });

  it('should save transactions to database', async () => {
    // Create test user
    await db.insert(usersTable).values({}).execute();

    // Create initial balance
    await db.insert(balancesTable).values({
      user_id: 1,
      crypto_type: 'BITCOIN',
      amount: '1.0',
      updated_at: new Date()
    }).execute();

    const result = await swapCrypto(testInput);

    // Verify transactions were saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, 1))
      .execute();

    expect(transactions).toHaveLength(2);

    const swapFromTx = transactions.find(tx => tx.transaction_type === 'SWAP_FROM');
    expect(swapFromTx).toBeDefined();
    expect(swapFromTx!.id).toEqual(result[0].id);

    const swapToTx = transactions.find(tx => tx.transaction_type === 'SWAP_TO');
    expect(swapToTx).toBeDefined();
    expect(swapToTx!.id).toEqual(result[1].id);
  });

  it('should throw error for insufficient balance', async () => {
    // Create test user
    await db.insert(usersTable).values({}).execute();

    // Create insufficient balance
    await db.insert(balancesTable).values({
      user_id: 1,
      crypto_type: 'BITCOIN',
      amount: '0.3',
      updated_at: new Date()
    }).execute();

    await expect(swapCrypto(testInput)).rejects.toThrow(/insufficient balance/i);
  });

  it('should throw error for non-existent balance', async () => {
    // Create test user without any balance
    await db.insert(usersTable).values({}).execute();

    await expect(swapCrypto(testInput)).rejects.toThrow(/no balance found/i);
  });
});
