
import { db } from '../db';
import { balancesTable, usersTable } from '../db/schema';
import { type GetUserBalancesInput, type Balance, cryptoTypeSchema } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserBalances(input: GetUserBalancesInput): Promise<Balance[]> {
  try {
    // Verify user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Get existing balances for the user
    const existingBalances = await db.select()
      .from(balancesTable)
      .where(eq(balancesTable.user_id, input.user_id))
      .execute();

    // Convert numeric amounts to numbers
    const balancesWithNumbers = existingBalances.map(balance => ({
      ...balance,
      amount: parseFloat(balance.amount)
    }));

    // Get all supported crypto types
    const allCryptoTypes = cryptoTypeSchema.options;
    const existingCryptoTypes = new Set(balancesWithNumbers.map(b => b.crypto_type));

    // Create zero balances for missing crypto types
    const missingBalances: Balance[] = allCryptoTypes
      .filter(cryptoType => !existingCryptoTypes.has(cryptoType))
      .map(cryptoType => ({
        id: 0, // Placeholder ID for zero balances
        user_id: input.user_id,
        crypto_type: cryptoType,
        amount: 0,
        updated_at: new Date()
      }));

    // Combine existing and missing balances
    return [...balancesWithNumbers, ...missingBalances];
  } catch (error) {
    console.error('Failed to get user balances:', error);
    throw error;
  }
}
