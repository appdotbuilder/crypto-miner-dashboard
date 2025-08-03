
import { db } from '../db';
import { balancesTable } from '../db/schema';
import { type GetUserBalancesInput, type Balance, cryptoTypeSchema } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserBalances(input: GetUserBalancesInput): Promise<Balance[]> {
  try {
    // Get existing balances for the user
    const existingBalances = await db.select()
      .from(balancesTable)
      .where(eq(balancesTable.user_id, input.user_id))
      .execute();

    // Get all supported crypto types
    const allCryptoTypes = cryptoTypeSchema.options;
    
    // Create a map of existing balances by crypto type
    const balanceMap = new Map<string, Balance>();
    existingBalances.forEach(balance => {
      balanceMap.set(balance.crypto_type, {
        ...balance,
        amount: parseFloat(balance.amount) // Convert numeric to number
      });
    });

    // Return balances for all crypto types, showing 0 for missing ones
    return allCryptoTypes.map(cryptoType => {
      const existingBalance = balanceMap.get(cryptoType);
      if (existingBalance) {
        return existingBalance;
      }
      
      // Return a virtual balance with 0 amount for missing crypto types
      return {
        id: 0, // Virtual ID for non-persisted balances
        user_id: input.user_id,
        crypto_type: cryptoType,
        amount: 0,
        updated_at: new Date()
      };
    });
  } catch (error) {
    console.error('Getting user balances failed:', error);
    throw error;
  }
}
