
import { db } from '../db';
import { balancesTable, transactionsTable } from '../db/schema';
import { type SwapCryptoInput, type Transaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export const swapCrypto = async (input: SwapCryptoInput): Promise<Transaction[]> => {
  try {
    // 1. Check if user has sufficient balance in from_crypto
    const fromBalance = await db.select()
      .from(balancesTable)
      .where(and(
        eq(balancesTable.user_id, input.user_id),
        eq(balancesTable.crypto_type, input.from_crypto)
      ))
      .execute();

    if (fromBalance.length === 0) {
      throw new Error(`No balance found for ${input.from_crypto}`);
    }

    const currentFromBalance = parseFloat(fromBalance[0].amount);
    if (currentFromBalance < input.amount) {
      throw new Error(`Insufficient balance. Available: ${currentFromBalance}, Required: ${input.amount}`);
    }

    // 2. Calculate new balances (using 1:1 swap rate for simplicity)
    const newFromAmount = currentFromBalance - input.amount;

    // 3. Check if user has existing to_crypto balance
    const toBalance = await db.select()
      .from(balancesTable)
      .where(and(
        eq(balancesTable.user_id, input.user_id),
        eq(balancesTable.crypto_type, input.to_crypto)
      ))
      .execute();

    let newToAmount = input.amount;
    if (toBalance.length > 0) {
      newToAmount = parseFloat(toBalance[0].amount) + input.amount;
    }

    // 4. Update from_crypto balance
    await db.update(balancesTable)
      .set({
        amount: newFromAmount.toString(),
        updated_at: new Date()
      })
      .where(and(
        eq(balancesTable.user_id, input.user_id),
        eq(balancesTable.crypto_type, input.from_crypto)
      ))
      .execute();

    // 5. Update or create to_crypto balance
    if (toBalance.length > 0) {
      await db.update(balancesTable)
        .set({
          amount: newToAmount.toString(),
          updated_at: new Date()
        })
        .where(and(
          eq(balancesTable.user_id, input.user_id),
          eq(balancesTable.crypto_type, input.to_crypto)
        ))
        .execute();
    } else {
      await db.insert(balancesTable)
        .values({
          user_id: input.user_id,
          crypto_type: input.to_crypto,
          amount: newToAmount.toString(),
          updated_at: new Date()
        })
        .execute();
    }

    // 6. Create SWAP_FROM transaction
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

    // 7. Create SWAP_TO transaction
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

    // 8. Return both transactions with numeric conversions
    return [
      {
        ...swapFromResult[0],
        amount: parseFloat(swapFromResult[0].amount)
      },
      {
        ...swapToResult[0],
        amount: parseFloat(swapToResult[0].amount)
      }
    ];
  } catch (error) {
    console.error('Crypto swap failed:', error);
    throw error;
  }
};
