import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, balancesTable, transactionsTable, walletAddressesTable } from '../db/schema';
import { type WithdrawToWalletInput } from '../schema';
import { withdrawToWallet } from '../handlers/withdraw_to_wallet';
import { eq, and } from 'drizzle-orm';

describe('withdrawToWallet', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully withdraw to an existing wallet address', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create user balance
    await db.insert(balancesTable)
      .values({
        user_id: userId,
        crypto_type: 'BITCOIN',
        amount: '1.0'
      })
      .execute();

    // Create wallet address
    const walletAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    await db.insert(walletAddressesTable)
      .values({
        user_id: userId,
        crypto_type: 'BITCOIN',
        address: walletAddress
      })
      .execute();

    const input: WithdrawToWalletInput = {
      user_id: userId,
      crypto_type: 'BITCOIN',
      amount: 0.5,
      wallet_address: walletAddress
    };

    const result = await withdrawToWallet(input);

    // Verify transaction record
    expect(result.user_id).toEqual(userId);
    expect(result.transaction_type).toEqual('WITHDRAWAL_TO_WALLET');
    expect(result.crypto_type).toEqual('BITCOIN');
    expect(result.amount).toEqual(0.5);
    expect(result.from_crypto_type).toEqual('BITCOIN');
    expect(result.to_crypto_type).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should throw error for insufficient balance', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create user balance with insufficient amount
    await db.insert(balancesTable)
      .values({
        user_id: userId,
        crypto_type: 'BITCOIN',
        amount: '0.3'
      })
      .execute();

    // Create wallet address
    const walletAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    await db.insert(walletAddressesTable)
      .values({
        user_id: userId,
        crypto_type: 'BITCOIN',
        address: walletAddress
      })
      .execute();

    const input: WithdrawToWalletInput = {
      user_id: userId,
      crypto_type: 'BITCOIN',
      amount: 0.5,
      wallet_address: walletAddress
    };

    expect(withdrawToWallet(input)).rejects.toThrow(/insufficient balance/i);
  });

  it('should throw error when no balance exists for crypto type', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create wallet address but no balance
    const walletAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    await db.insert(walletAddressesTable)
      .values({
        user_id: userId,
        crypto_type: 'BITCOIN',
        address: walletAddress
      })
      .execute();

    const input: WithdrawToWalletInput = {
      user_id: userId,
      crypto_type: 'BITCOIN',
      amount: 0.5,
      wallet_address: walletAddress
    };

    expect(withdrawToWallet(input)).rejects.toThrow(/insufficient balance/i);
  });

  it('should throw error when no matching wallet address is found', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create user balance
    await db.insert(balancesTable)
      .values({
        user_id: userId,
        crypto_type: 'BITCOIN',
        amount: '1.0'
      })
      .execute();

    // Create wallet address but with different address
    await db.insert(walletAddressesTable)
      .values({
        user_id: userId,
        crypto_type: 'BITCOIN',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      })
      .execute();

    const input: WithdrawToWalletInput = {
      user_id: userId,
      crypto_type: 'BITCOIN',
      amount: 0.5,
      wallet_address: 'different-wallet-address' // Different address
    };

    expect(withdrawToWallet(input)).rejects.toThrow(/no matching wallet address found/i);
  });

  it('should correctly update balance and create transaction record', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create user balance
    const initialBalance = 1.5;
    await db.insert(balancesTable)
      .values({
        user_id: userId,
        crypto_type: 'ETHEREUM_CLASSIC',
        amount: initialBalance.toString()
      })
      .execute();

    // Create wallet address
    const walletAddress = '0x742d35Cc6634C0532925a3b8D0c1e8e5b57b2F1a';
    await db.insert(walletAddressesTable)
      .values({
        user_id: userId,
        crypto_type: 'ETHEREUM_CLASSIC',
        address: walletAddress
      })
      .execute();

    const withdrawAmount = 0.7;
    const input: WithdrawToWalletInput = {
      user_id: userId,
      crypto_type: 'ETHEREUM_CLASSIC',
      amount: withdrawAmount,
      wallet_address: walletAddress
    };

    const result = await withdrawToWallet(input);

    // Check updated balance
    const balances = await db.select()
      .from(balancesTable)
      .where(and(
        eq(balancesTable.user_id, userId),
        eq(balancesTable.crypto_type, 'ETHEREUM_CLASSIC')
      ))
      .execute();

    expect(balances).toHaveLength(1);
    expect(parseFloat(balances[0].amount)).toEqual(initialBalance - withdrawAmount); // 1.5 - 0.7 = 0.8

    // Check transaction record was saved to database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(userId);
    expect(transactions[0].transaction_type).toEqual('WITHDRAWAL_TO_WALLET');
    expect(transactions[0].crypto_type).toEqual('ETHEREUM_CLASSIC');
    expect(parseFloat(transactions[0].amount)).toEqual(withdrawAmount);
    expect(transactions[0].from_crypto_type).toEqual('ETHEREUM_CLASSIC');
    expect(transactions[0].to_crypto_type).toBeNull();
    expect(transactions[0].created_at).toBeInstanceOf(Date);
  });

  it('should work with different crypto types', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create user balance for SOLANA
    await db.insert(balancesTable)
      .values({
        user_id: userId,
        crypto_type: 'SOLANA',
        amount: '100.0'
      })
      .execute();

    // Create wallet address for SOLANA
    const walletAddress = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
    await db.insert(walletAddressesTable)
      .values({
        user_id: userId,
        crypto_type: 'SOLANA',
        address: walletAddress
      })
      .execute();

    const input: WithdrawToWalletInput = {
      user_id: userId,
      crypto_type: 'SOLANA',
      amount: 25.5,
      wallet_address: walletAddress
    };

    const result = await withdrawToWallet(input);

    // Verify transaction record
    expect(result.crypto_type).toEqual('SOLANA');
    expect(result.amount).toEqual(25.5);
    expect(result.from_crypto_type).toEqual('SOLANA');
    
    // Verify balance updated correctly
    const balances = await db.select()
      .from(balancesTable)
      .where(and(
        eq(balancesTable.user_id, userId),
        eq(balancesTable.crypto_type, 'SOLANA')
      ))
      .execute();

    expect(parseFloat(balances[0].amount)).toEqual(74.5); // 100 - 25.5
  });

  it('should validate that user_id and crypto_type match for wallet address', async () => {
    // Create test users
    const userResult1 = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId1 = userResult1[0].id;

    const userResult2 = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();
    const userId2 = userResult2[0].id;

    // Create balance for user1
    await db.insert(balancesTable)
      .values({
        user_id: userId1,
        crypto_type: 'BITCOIN',
        amount: '1.0'
      })
      .execute();

    // Create wallet address for user2 (different user)
    const walletAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    await db.insert(walletAddressesTable)
      .values({
        user_id: userId2, // Different user
        crypto_type: 'BITCOIN',
        address: walletAddress
      })
      .execute();

    const input: WithdrawToWalletInput = {
      user_id: userId1, // Trying to withdraw with user1
      crypto_type: 'BITCOIN',
      amount: 0.5,
      wallet_address: walletAddress // But wallet belongs to user2
    };

    expect(withdrawToWallet(input)).rejects.toThrow(/no matching wallet address found/i);
  });
});