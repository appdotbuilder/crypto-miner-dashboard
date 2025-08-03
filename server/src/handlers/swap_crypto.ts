
import { db } from '../db';
import { balancesTable, transactionsTable } from '../db/schema';
import { type SwapCryptoInput, type Transaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function swapCrypto(input: SwapCryptoInput): Promise<Transaction[]> {
  try {
    // 1. Check if user has sufficient balance in from_crypto
    const fromBalance = await db.select()
      .from(balancesTable)
      .where(
        and(
          eq(balancesTable.user_id, input.user_id),
          eq(balancesTable.crypto_type, input.from_crypto)
        )
      )
      .execute();

    if (fromBalance.length === 0) {
      throw new Error(`No balance found for crypto type ${input.from_crypto}`);
    }

    const currentFromBalance = parseFloat(fromBalance[0].amount);
    if (currentFromBalance < input.amount) {
      throw new Error(`Insufficient balance. Available: ${currentFromBalance}, Required: ${input.amount}`);
    }

    // 2. Get or create to_crypto balance
    const toBalance = await db.select()
      .from(balancesTable)
      .where(
        and(
          eq(balancesTable.user_id, input.user_id),
          eq(balancesTable.crypto_type, input.to_crypto)
        )
      )
      .execute();

    let currentToBalance = 0;
    if (toBalance.length > 0) {
      currentToBalance = parseFloat(toBalance[0].amount);
    }

    // 3. Update from_crypto balance (deduct amount)
    await db.update(balancesTable)
      .set({
        amount: (currentFromBalance - input.amount).toString(),
        updated_at: new Date()
      })
      .where(
        and(
          eq(balancesTable.user_id, input.user_id),
          eq(balancesTable.crypto_type, input.from_crypto)
        )
      )
      .execute();

    // 4. Update or create to_crypto balance (add amount)
    if (toBalance.length > 0) {
      // Update existing balance
      await db.update(balancesTable)
        .set({
          amount: (currentToBalance + input.amount).toString(),
          updated_at: new Date()
        })
        .where(
          and(
            eq(balancesTable.user_id, input.user_id),
            eq(balancesTable.crypto_type, input.to_crypto)
          )
        )
        .execute();
    } else {
      // Create new balance record
      await db.insert(balancesTable)
        .values({
          user_id: input.user_id,
          crypto_type: input.to_crypto,
          amount: input.amount.toString(),
          updated_at: new Date()
        })
        .execute();
    }

    // 5. Create SWAP_FROM transaction record
    const swapFromResult = await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        transaction_type: 'SWAP_FROM',
        crypto_type: input.from_crypto,
        amount: input.amount.toString(),
        from_crypto_type: input.from_crypto,
        to_crypto_type: input.to_crypto
      })
      .returning()
      .execute();

    // 6. Create SWAP_TO transaction record
    const swapToResult = await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        transaction_type: 'SWAP_TO',
        crypto_type: input.to_crypto,
        amount: input.amount.toString(),
        from_crypto_type: input.from_crypto,
        to_crypto_type: input.to_crypto
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transactions: Transaction[] = [
      {
        ...swapFromResult[0],
        amount: parseFloat(swapFromResult[0].amount)
      },
      {
        ...swapToResult[0],
        amount: parseFloat(swapToResult[0].amount)
      }
    ];

    return transactions;
  } catch (error) {
    console.error('Crypto swap failed:', error);
    throw error;
  }
}
