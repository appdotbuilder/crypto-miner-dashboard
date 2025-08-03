import { db } from '../db';
import { balancesTable, transactionsTable, walletAddressesTable } from '../db/schema';
import { type WithdrawToWalletInput, type Transaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function withdrawToWallet(input: WithdrawToWalletInput): Promise<Transaction> {
  try {
    // Validate that amount is positive (already done by Zod schema, but keep for explicit validation)
    if (input.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Fetch the user's balance for the specified crypto_type
    const existingBalances = await db.select()
      .from(balancesTable)
      .where(and(
        eq(balancesTable.user_id, input.user_id),
        eq(balancesTable.crypto_type, input.crypto_type)
      ))
      .execute();

    if (existingBalances.length === 0) {
      throw new Error('Insufficient balance');
    }

    const currentBalance = parseFloat(existingBalances[0].amount);

    // Check if balance is sufficient
    if (currentBalance < input.amount) {
      throw new Error('Insufficient balance');
    }

    // Fetch the user's saved wallet address for the specified crypto_type that matches the provided wallet_address
    const matchingWalletAddresses = await db.select()
      .from(walletAddressesTable)
      .where(and(
        eq(walletAddressesTable.user_id, input.user_id),
        eq(walletAddressesTable.crypto_type, input.crypto_type),
        eq(walletAddressesTable.address, input.wallet_address)
      ))
      .execute();

    if (matchingWalletAddresses.length === 0) {
      throw new Error('No matching wallet address found');
    }

    // Deduct the amount from the user's balance
    const newBalance = currentBalance - input.amount;
    await db.update(balancesTable)
      .set({
        amount: newBalance.toString(),
        updated_at: new Date()
      })
      .where(eq(balancesTable.id, existingBalances[0].id))
      .execute();

    // Insert a new transaction record
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        transaction_type: 'WITHDRAWAL_TO_WALLET',
        crypto_type: input.crypto_type,
        amount: input.amount.toString(),
        from_crypto_type: input.crypto_type,
        to_crypto_type: null // External withdrawal
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount)
    };
  } catch (error) {
    console.error('Withdrawal to wallet failed:', error);
    throw error;
  }
}