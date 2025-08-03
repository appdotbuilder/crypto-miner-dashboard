
import { db } from '../db';
import { walletAddressesTable } from '../db/schema';
import { type GetUserWalletAddressesInput, type WalletAddress } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserWalletAddresses = async (input: GetUserWalletAddressesInput): Promise<WalletAddress[]> => {
  try {
    const results = await db.select()
      .from(walletAddressesTable)
      .where(eq(walletAddressesTable.user_id, input.user_id))
      .execute();

    return results;
  } catch (error) {
    console.error('Get user wallet addresses failed:', error);
    throw error;
  }
};
