
import { db } from '../db';
import { walletAddressesTable, usersTable } from '../db/schema';
import { type SaveWalletAddressInput, type WalletAddress } from '../schema';
import { eq, and } from 'drizzle-orm';

export const saveWalletAddress = async (input: SaveWalletAddressInput): Promise<WalletAddress> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Check if wallet address already exists for this user and crypto type
    const existingWallet = await db.select()
      .from(walletAddressesTable)
      .where(
        and(
          eq(walletAddressesTable.user_id, input.user_id),
          eq(walletAddressesTable.crypto_type, input.crypto_type)
        )
      )
      .execute();

    if (existingWallet.length > 0) {
      // Update existing wallet address
      const result = await db.update(walletAddressesTable)
        .set({
          address: input.address,
          updated_at: new Date()
        })
        .where(eq(walletAddressesTable.id, existingWallet[0].id))
        .returning()
        .execute();

      return result[0];
    } else {
      // Create new wallet address
      const result = await db.insert(walletAddressesTable)
        .values({
          user_id: input.user_id,
          crypto_type: input.crypto_type,
          address: input.address
        })
        .returning()
        .execute();

      return result[0];
    }
  } catch (error) {
    console.error('Save wallet address failed:', error);
    throw error;
  }
};
