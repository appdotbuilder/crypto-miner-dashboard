
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const cryptoTypeEnum = pgEnum('crypto_type', [
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

export const transactionTypeEnum = pgEnum('transaction_type', [
  'MINING_WITHDRAWAL',
  'SWAP_FROM',
  'SWAP_TO'
]);

export const miningStatusEnum = pgEnum('mining_status', ['ACTIVE', 'STOPPED']);

// Tables
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const balancesTable = pgTable('balances', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  crypto_type: cryptoTypeEnum('crypto_type').notNull(),
  amount: numeric('amount', { precision: 20, scale: 8 }).notNull().default('0'),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const miningSessionsTable = pgTable('mining_sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  status: miningStatusEnum('status').notNull().default('STOPPED'),
  mining_balance: numeric('mining_balance', { precision: 20, scale: 8 }).notNull().default('0'),
  started_at: timestamp('started_at'),
  stopped_at: timestamp('stopped_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  transaction_type: transactionTypeEnum('transaction_type').notNull(),
  crypto_type: cryptoTypeEnum('crypto_type').notNull(),
  amount: numeric('amount', { precision: 20, scale: 8 }).notNull(),
  from_crypto_type: cryptoTypeEnum('from_crypto_type'),
  to_crypto_type: cryptoTypeEnum('to_crypto_type'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const walletAddressesTable = pgTable('wallet_addresses', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  crypto_type: cryptoTypeEnum('crypto_type').notNull(),
  address: text('address').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  balances: many(balancesTable),
  miningSessions: many(miningSessionsTable),
  transactions: many(transactionsTable),
  walletAddresses: many(walletAddressesTable),
}));

export const balancesRelations = relations(balancesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [balancesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const miningSessionsRelations = relations(miningSessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [miningSessionsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const walletAddressesRelations = relations(walletAddressesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [walletAddressesTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Balance = typeof balancesTable.$inferSelect;
export type NewBalance = typeof balancesTable.$inferInsert;

export type MiningSession = typeof miningSessionsTable.$inferSelect;
export type NewMiningSession = typeof miningSessionsTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type WalletAddress = typeof walletAddressesTable.$inferSelect;
export type NewWalletAddress = typeof walletAddressesTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  balances: balancesTable,
  miningSessions: miningSessionsTable,
  transactions: transactionsTable,
  walletAddresses: walletAddressesTable,
};
