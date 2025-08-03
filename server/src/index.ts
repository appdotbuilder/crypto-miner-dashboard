
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createUserInputSchema,
  startMiningInputSchema,
  stopMiningInputSchema,
  getMiningSessionInputSchema,
  withdrawMiningInputSchema,
  getUserBalancesInputSchema,
  swapCryptoInputSchema,
  getUserTransactionsInputSchema,
  saveWalletAddressInputSchema,
  getUserWalletAddressesInputSchema,
  withdrawToWalletInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { startMining } from './handlers/start_mining';
import { stopMining } from './handlers/stop_mining';
import { getMiningSession } from './handlers/get_mining_session';
import { withdrawMining } from './handlers/withdraw_mining';
import { getUserBalances } from './handlers/get_user_balances';
import { swapCrypto } from './handlers/swap_crypto';
import { getUserTransactions } from './handlers/get_user_transactions';
import { saveWalletAddress } from './handlers/save_wallet_address';
import { getUserWalletAddresses } from './handlers/get_user_wallet_addresses';
import { withdrawToWallet } from './handlers/withdraw_to_wallet';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Mining operations
  startMining: publicProcedure
    .input(startMiningInputSchema)
    .mutation(({ input }) => startMining(input)),

  stopMining: publicProcedure
    .input(stopMiningInputSchema)
    .mutation(({ input }) => stopMining(input)),

  getMiningSession: publicProcedure
    .input(getMiningSessionInputSchema)
    .query(({ input }) => getMiningSession(input)),

  withdrawMining: publicProcedure
    .input(withdrawMiningInputSchema)
    .mutation(({ input }) => withdrawMining(input)),

  // Balance management
  getUserBalances: publicProcedure
    .input(getUserBalancesInputSchema)
    .query(({ input }) => getUserBalances(input)),

  swapCrypto: publicProcedure
    .input(swapCryptoInputSchema)
    .mutation(({ input }) => swapCrypto(input)),

  // Transaction history
  getUserTransactions: publicProcedure
    .input(getUserTransactionsInputSchema)
    .query(({ input }) => getUserTransactions(input)),

  // Wallet address management
  saveWalletAddress: publicProcedure
    .input(saveWalletAddressInputSchema)
    .mutation(({ input }) => saveWalletAddress(input)),

  getUserWalletAddresses: publicProcedure
    .input(getUserWalletAddressesInputSchema)
    .query(({ input }) => getUserWalletAddresses(input)),

  withdrawToWallet: publicProcedure
    .input(withdrawToWalletInputSchema)
    .mutation(({ input }) => withdrawToWallet(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
