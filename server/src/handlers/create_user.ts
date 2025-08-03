
import { db } from '../db';
import { usersTable, balancesTable } from '../db/schema';
import { type CreateUserInput, type User, cryptoTypeSchema } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Create the user first
    const userResult = await db.insert(usersTable)
      .values({})
      .returning()
      .execute();

    const user = userResult[0];

    // Initialize balances for all cryptocurrency types with 0 amount
    const cryptoTypes = cryptoTypeSchema.options;
    const balanceValues = cryptoTypes.map(cryptoType => ({
      user_id: user.id,
      crypto_type: cryptoType,
      amount: '0' // Convert number to string for numeric column
    }));

    await db.insert(balancesTable)
      .values(balanceValues)
      .execute();

    return user;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
