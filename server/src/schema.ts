
import { z } from 'zod';

// Supported cryptocurrency types
export const cryptoTypeSchema = z.enum([
  'BITCOIN',
  'BITCOIN_GREEN', 
  'BITCOIN_CASH',
  'ETHEREUM_CLASSIC',
  'BINANCE_COIN',
  'SOLANA',
  'TON',
  'NOTCOIN',
  'DOGECOIN',
  'TRUMP',
  'TETHER',
  'LITECOIN'
]);

export type CryptoType = z.infer<typeof cryptoTypeSchema>;

// Transaction types
export const transactionTypeSchema = z.enum([
  'MINING_WITHDRAWAL',
  'SWAP_FROM',
  'SWAP_TO',
  'WITHDRAWAL_TO_WALLET'
]);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

// Mining status
export const miningStatusSchema = z.enum(['ACTIVE', 'STOPPED']);
export type MiningStatus = z.infer<typeof miningStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Balance schema
export const balanceSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  crypto_type: cryptoTypeSchema,
  amount: z.number(),
  updated_at: z.coerce.date()
});

export type Balance = z.infer<typeof balanceSchema>;

// Mining session schema
export const miningSessionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  status: miningStatusSchema,
  mining_balance: z.number(),
  started_at: z.coerce.date().nullable(),
  stopped_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type MiningSession = z.infer<typeof miningSessionSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  transaction_type: transactionTypeSchema,
  crypto_type: cryptoTypeSchema,
  amount: z.number(),
  from_crypto_type: cryptoTypeSchema.nullable(),
  to_crypto_type: cryptoTypeSchema.nullable(),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Wallet address schema
export const walletAddressSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  crypto_type: cryptoTypeSchema,
  address: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type WalletAddress = z.infer<typeof walletAddressSchema>;

// Input schemas for creating/updating
export const createUserInputSchema = z.object({});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const startMiningInputSchema = z.object({
  user_id: z.number()
});
export type StartMiningInput = z.infer<typeof startMiningInputSchema>;

export const stopMiningInputSchema = z.object({
  user_id: z.number()
});
export type StopMiningInput = z.infer<typeof stopMiningInputSchema>;

export const withdrawMiningInputSchema = z.object({
  user_id: z.number()
});
export type WithdrawMiningInput = z.infer<typeof withdrawMiningInputSchema>;

export const swapCryptoInputSchema = z.object({
  user_id: z.number(),
  from_crypto: cryptoTypeSchema,
  to_crypto: cryptoTypeSchema,
  amount: z.number().positive()
});
export type SwapCryptoInput = z.infer<typeof swapCryptoInputSchema>;

export const saveWalletAddressInputSchema = z.object({
  user_id: z.number(),
  crypto_type: cryptoTypeSchema,
  address: z.string().min(1)
});
export type SaveWalletAddressInput = z.infer<typeof saveWalletAddressInputSchema>;

export const getUserBalancesInputSchema = z.object({
  user_id: z.number()
});
export type GetUserBalancesInput = z.infer<typeof getUserBalancesInputSchema>;

export const getUserTransactionsInputSchema = z.object({
  user_id: z.number()
});
export type GetUserTransactionsInput = z.infer<typeof getUserTransactionsInputSchema>;

export const getMiningSessionInputSchema = z.object({
  user_id: z.number()
});
export type GetMiningSessionInput = z.infer<typeof getMiningSessionInputSchema>;

export const getUserWalletAddressesInputSchema = z.object({
  user_id: z.number()
});
export type GetUserWalletAddressesInput = z.infer<typeof getUserWalletAddressesInputSchema>;

export const withdrawToWalletInputSchema = z.object({
  user_id: z.number(),
  crypto_type: cryptoTypeSchema,
  amount: z.number().positive(),
  wallet_address: z.string().min(1)
});
export type WithdrawToWalletInput = z.infer<typeof withdrawToWalletInputSchema>;
