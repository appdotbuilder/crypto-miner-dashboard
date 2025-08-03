
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { AlertCircle, Bitcoin, TrendingUp, Wallet, History, Settings, Play, Square, ArrowUpDown, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { 
  User, 
  Balance, 
  MiningSession, 
  Transaction, 
  WalletAddress, 
  CryptoType,
  SwapCryptoInput,
  SaveWalletAddressInput 
} from '../../server/src/schema';

// Cryptocurrency display information
const CRYPTO_INFO: Record<CryptoType, { name: string; symbol: string; color: string; emoji: string }> = {
  BITCOIN: { name: 'Bitcoin', symbol: 'BTC', color: 'bg-orange-500', emoji: '₿' },
  BITCOIN_GREEN: { name: 'Bitcoin Green', symbol: 'BITG', color: 'bg-green-500', emoji: '🌱' },
  BITCOIN_CASH: { name: 'Bitcoin Cash', symbol: 'BCH', color: 'bg-green-600', emoji: '💚' },
  ETHEREUM_CLASSIC: { name: 'Ethereum Classic', symbol: 'ETC', color: 'bg-emerald-500', emoji: '⚡' },
  BINANCE_COIN: { name: 'Binance Coin', symbol: 'BNB', color: 'bg-yellow-500', emoji: '🔥' },
  SOLANA: { name: 'Solana', symbol: 'SOL', color: 'bg-purple-500', emoji: '☀️' },
  TON: { name: 'TON', symbol: 'TON', color: 'bg-blue-500', emoji: '💎' },
  NOTCOIN: { name: 'Notcoin', symbol: 'NOT', color: 'bg-gray-500', emoji: '🚫' },
  DOGECOIN: { name: 'Dogecoin', symbol: 'DOGE', color: 'bg-yellow-400', emoji: '🐕' },
  TRUMP: { name: 'Trump', symbol: 'TRUMP', color: 'bg-red-500', emoji: '🦅' },
  TETHER: { name: 'Tether', symbol: 'USDT', color: 'bg-green-400', emoji: '💵' },
  LITECOIN: { name: 'Litecoin', symbol: 'LTC', color: 'bg-gray-400', emoji: '⚪' }
};

function App() {
  // State management
  const [user, setUser] = useState<User | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [miningSession, setMiningSession] = useState<MiningSession | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletAddresses, setWalletAddresses] = useState<WalletAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [swapForm, setSwapForm] = useState<SwapCryptoInput>({
    user_id: 1,
    from_crypto: 'BITCOIN',
    to_crypto: 'ETHEREUM_CLASSIC',
    amount: 0
  });

  const [walletForm, setWalletForm] = useState<SaveWalletAddressInput>({
    user_id: 1,
    crypto_type: 'BITCOIN',
    address: ''
  });

  // Mining simulation state
  const [miningProgress, setMiningProgress] = useState(0);
  const [miningTimer, setMiningTimer] = useState<number | null>(null);

  // Demo mode state - fallback when server is not available
  const [demoMode, setDemoMode] = useState(false);

  // Initialize demo data for offline mode
  const initializeDemoMode = useCallback(() => {
    setDemoMode(true);
    setUser({ id: 1, created_at: new Date() });
    setBalances([
      { id: 1, user_id: 1, crypto_type: 'BITCOIN', amount: 0.00123456, updated_at: new Date() },
      { id: 2, user_id: 1, crypto_type: 'ETHEREUM_CLASSIC', amount: 2.5, updated_at: new Date() },
      { id: 3, user_id: 1, crypto_type: 'DOGECOIN', amount: 100.0, updated_at: new Date() },
      { id: 4, user_id: 1, crypto_type: 'SOLANA', amount: 5.75, updated_at: new Date() },
      { id: 5, user_id: 1, crypto_type: 'TETHER', amount: 50.0, updated_at: new Date() }
    ]);
    setMiningSession({
      id: 1,
      user_id: 1,
      status: 'STOPPED',
      mining_balance: 0.00005678,
      started_at: null,
      stopped_at: new Date(),
      created_at: new Date()
    });
    setTransactions([
      {
        id: 1,
        user_id: 1,
        transaction_type: 'MINING_WITHDRAWAL',
        crypto_type: 'BITCOIN',
        amount: 0.00012345,
        from_crypto_type: null,
        to_crypto_type: null,
        created_at: new Date(Date.now() - 3600000)
      },
      {
        id: 2,
        user_id: 1,
        transaction_type: 'SWAP_FROM',
        crypto_type: 'BITCOIN',
        amount: 0.001,
        from_crypto_type: 'BITCOIN',
        to_crypto_type: 'ETHEREUM_CLASSIC',
        created_at: new Date(Date.now() - 7200000)
      },
      {
        id: 3,
        user_id: 1,
        transaction_type: 'SWAP_TO',
        crypto_type: 'ETHEREUM_CLASSIC',
        amount: 0.001,
        from_crypto_type: 'BITCOIN',
        to_crypto_type: 'ETHEREUM_CLASSIC',
        created_at: new Date(Date.now() - 7200000)
      }
    ]);
    setWalletAddresses([
      {
        id: 1,
        user_id: 1,
        crypto_type: 'BITCOIN',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        user_id: 1,
        crypto_type: 'ETHEREUM_CLASSIC',
        address: '0x742d35Cc6634C0532925a3b8D35612345dCf3d8bE',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    setSwapForm(prev => ({ ...prev, user_id: 1 }));
    setWalletForm(prev => ({ ...prev, user_id: 1 }));
    setError('Server unavailable. Running in demo mode with sample data.');
    setIsLoading(false);
  }, []);

  // Initialize app - try server once, then fallback to demo mode immediately
  const initializeApp = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Single attempt to connect to server with short timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 3000)
      );
      
      const userPromise = trpc.createUser.mutate({});
      const newUser = await Promise.race([userPromise, timeoutPromise]) as User;
      
      // If successful, load user data
      setUser(newUser);
      setSwapForm(prev => ({ ...prev, user_id: newUser.id }));
      setWalletForm(prev => ({ ...prev, user_id: newUser.id }));
      
      // Load additional data
      const [balancesData, miningData, transactionsData, walletsData] = await Promise.all([
        trpc.getUserBalances.query({ user_id: newUser.id }),
        trpc.getMiningSession.query({ user_id: newUser.id }),
        trpc.getUserTransactions.query({ user_id: newUser.id }),
        trpc.getUserWalletAddresses.query({ user_id: newUser.id })
      ]);

      setBalances(balancesData);
      setMiningSession(miningData);
      setTransactions(transactionsData);
      setWalletAddresses(walletsData);
      
      setIsLoading(false);
      setDemoMode(false);
    } catch (error) {
      console.error('Server connection failed, switching to demo mode:', error);
      initializeDemoMode();
    }
  }, [initializeDemoMode]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Mining simulation effect
  useEffect(() => {
    if (miningSession?.status === 'ACTIVE') {
      const timer = window.setInterval(() => {
        setMiningProgress(prev => {
          const newProgress = prev + 1.67; // ~1.67% per second = 100% per minute
          return newProgress > 100 ? 100 : newProgress;
        });
      }, 1000);
      setMiningTimer(timer);
      return () => {
        if (timer) {
          window.clearInterval(timer);
        }
      };
    } else {
      if (miningTimer) {
        window.clearInterval(miningTimer);
        setMiningTimer(null);
      }
      setMiningProgress(0);
    }
  }, [miningSession?.status, miningTimer]);

  // Demo mode handlers
  const handleDemoStartMining = () => {
    setMiningSession(prev => prev ? {
      ...prev,
      status: 'ACTIVE',
      started_at: new Date(),
      mining_balance: prev.mining_balance + 0.00001 // Simulate some mining
    } : null);
    setMiningProgress(0);
  };

  const handleDemoStopMining = () => {
    setMiningSession(prev => prev ? {
      ...prev,
      status: 'STOPPED',
      stopped_at: new Date(),
      mining_balance: prev.mining_balance + 0.00002 // Add some mined amount
    } : null);
  };

  const handleDemoWithdraw = () => {
    if (!miningSession?.mining_balance) return;
    
    const withdrawAmount = miningSession.mining_balance;
    setBalances(prev => {
      const existingBitcoin = prev.find(b => b.crypto_type === 'BITCOIN');
      if (existingBitcoin) {
        return prev.map(b => 
          b.crypto_type === 'BITCOIN' 
            ? { ...b, amount: b.amount + withdrawAmount, updated_at: new Date() }
            : b
        );
      } else {
        return [...prev, {
          id: prev.length + 1,
          user_id: 1,
          crypto_type: 'BITCOIN',
          amount: withdrawAmount,
          updated_at: new Date()
        }];
      }
    });
    
    setTransactions(prev => [{
      id: prev.length + 1,
      user_id: 1,
      transaction_type: 'MINING_WITHDRAWAL',
      crypto_type: 'BITCOIN',
      amount: withdrawAmount,
      from_crypto_type: null,
      to_crypto_type: null,
      created_at: new Date()
    }, ...prev]);
    
    setMiningSession(prev => prev ? { ...prev, mining_balance: 0 } : null);
  };

  // Mining operations
  const handleStartMining = async () => {
    if (!user) return;
    
    if (demoMode) {
      handleDemoStartMining();
      return;
    }
    
    setIsLoading(true);
    try {
      await trpc.startMining.mutate({ user_id: user.id });
      // Reload data after successful operation
      const miningData = await trpc.getMiningSession.query({ user_id: user.id });
      setMiningSession(miningData);
      setMiningProgress(0);
    } catch (error) {
      console.error('Failed to start mining:', error);
      setError('Failed to start mining');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopMining = async () => {
    if (!user) return;
    
    if (demoMode) {
      handleDemoStopMining();
      return;
    }
    
    setIsLoading(true);
    try {
      await trpc.stopMining.mutate({ user_id: user.id });
      const miningData = await trpc.getMiningSession.query({ user_id: user.id });
      setMiningSession(miningData);
    } catch (error) {
      console.error('Failed to stop mining:', error);
      setError('Failed to stop mining');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawMining = async () => {
    if (!user) return;
    
    if (demoMode) {
      handleDemoWithdraw();
      return;
    }
    
    setIsLoading(true);
    try {
      await trpc.withdrawMining.mutate({ user_id: user.id });
      // Reload relevant data
      const [balancesData, miningData, transactionsData] = await Promise.all([
        trpc.getUserBalances.query({ user_id: user.id }),
        trpc.getMiningSession.query({ user_id: user.id }),
        trpc.getUserTransactions.query({ user_id: user.id })
      ]);
      setBalances(balancesData);
      setMiningSession(miningData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to withdraw mining balance:', error);
      setError('Failed to withdraw mining balance');
    } finally {
      setIsLoading(false);
    }
  };

  // Swap operation
  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || swapForm.amount <= 0) return;
    
    if (demoMode) {
      // Demo swap logic
      const fromBalance = getBalance(swapForm.from_crypto);
      if (swapForm.amount > fromBalance) {
        setError('Insufficient balance for swap');
        return;
      }
      
      setBalances(prev => prev.map(b => {
        if (b.crypto_type === swapForm.from_crypto) {
          return { ...b, amount: b.amount - swapForm.amount, updated_at: new Date() };
        }
        if (b.crypto_type === swapForm.to_crypto) {
          return { ...b, amount: b.amount + swapForm.amount, updated_at: new Date() };
        }
        return b;
      }));
      
      setTransactions(prev => [
        {
          id: prev.length + 1,
          user_id: 1,
          transaction_type: 'SWAP_FROM',
          crypto_type: swapForm.from_crypto,
          amount: swapForm.amount,
          from_crypto_type: swapForm.from_crypto,
          to_crypto_type: swapForm.to_crypto,
          created_at: new Date()
        },
        {
          id: prev.length + 2,
          user_id: 1,
          transaction_type: 'SWAP_TO',
          crypto_type: swapForm.to_crypto,
          amount: swapForm.amount,
          from_crypto_type: swapForm.from_crypto,
          to_crypto_type: swapForm.to_crypto,
          created_at: new Date()
        },
        ...prev
      ]);
      
      setSwapForm(prev => ({ ...prev, amount: 0 }));
      return;
    }
    
    setIsLoading(true);
    try {
      await trpc.swapCrypto.mutate(swapForm);
      // Reload relevant data
      const [balancesData, transactionsData] = await Promise.all([
        trpc.getUserBalances.query({ user_id: user.id }),
        trpc.getUserTransactions.query({ user_id: user.id })
      ]);
      setBalances(balancesData);
      setTransactions(transactionsData);
      setSwapForm(prev => ({ ...prev, amount: 0 }));
    } catch (error) {
      console.error('Failed to swap cryptocurrency:', error);
      setError('Failed to perform swap');
    } finally {
      setIsLoading(false);
    }
  };

  // Wallet address operation
  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !walletForm.address.trim()) return;
    
    if (demoMode) {
      setWalletAddresses(prev => {
        const existing = prev.find(w => w.crypto_type === walletForm.crypto_type);
        if (existing) {
          return prev.map(w => 
            w.crypto_type === walletForm.crypto_type 
              ? { ...w, address: walletForm.address, updated_at: new Date() }
              : w
          );
        } else {
          return [...prev, {
            id: prev.length + 1,
            user_id: 1,
            crypto_type: walletForm.crypto_type,
            address: walletForm.address,
            created_at: new Date(),
            updated_at: new Date()
          }];
        }
      });
      setWalletForm(prev => ({ ...prev, address: '' }));
      return;
    }
    
    setIsLoading(true);
    try {
      await trpc.saveWalletAddress.mutate(walletForm);
      const walletsData = await trpc.getUserWalletAddresses.query({ user_id: user.id });
      setWalletAddresses(walletsData);
      setWalletForm(prev => ({ ...prev, address: '' }));
    } catch (error) {
      console.error('Failed to save wallet address:', error);
      setError('Failed to save wallet address');
    } finally {
      setIsLoading(false);
    }
  };

  // Retry connection
  const handleRetryConnection = () => {
    setDemoMode(false);
    setError(null);
    setUser(null);
    setBalances([]);
    setMiningSession(null);
    setTransactions([]);
    setWalletAddresses([]);
    initializeApp();
  };

  // Get balance for specific crypto
  const getBalance = (cryptoType: CryptoType): number => {
    return balances.find(b => b.crypto_type === cryptoType)?.amount || 0;
  };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Bitcoin className="w-12 h-12 mx-auto mb-4 text-orange-500 animate-spin" />
          <p className="text-lg text-gray-600">Initializing Crypto Dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bitcoin className="w-10 h-10 text-orange-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">
              Crypto Mining Dashboard
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Mine Bitcoin • Manage Cryptocurrencies • Track Transactions
          </p>
          {demoMode && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                🎮 Demo Mode - Interactive sample data
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRetryConnection}
                className="text-blue-600 hover:text-blue-800"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry Server Connection
              </Button>
            </div>
          )}
        </div>

        {error && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-700">
              {demoMode ? 'Demo Mode Active' : 'Notice'}
            </AlertTitle>
            <AlertDescription className="text-amber-700">
              {error}
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2 h-auto p-0 text-amber-700 hover:text-amber-800"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="mining" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm border">
            <TabsTrigger value="mining" className="flex items-center gap-2">
              <Bitcoin className="w-4 h-4" />
              Mining
            </TabsTrigger>
            <TabsTrigger value="balances" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Balances
            </TabsTrigger>
            <TabsTrigger value="swap" className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Swap
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="wallets" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Wallets
            </TabsTrigger>
          </TabsList>

          {/* Mining Tab */}
          <TabsContent value="mining" className="space-y-6">
            <Card className="border-orange-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Bitcoin className="w-6 h-6" />
                  Bitcoin Mining Station
                  {demoMode && <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">Demo</Badge>}
                </CardTitle>
                <CardDescription className="text-orange-100">
                  Start mining Bitcoin and watch your balance grow
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Mining Status:</span>
                      <Badge variant={miningSession?.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {miningSession?.status === 'ACTIVE' ? '🟢 Active' : '🔴 Stopped'}
                      </Badge>
                    </div>
                    
                    {miningSession?.status === 'ACTIVE' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Mining Progress:</span>
                          <span className="text-sm font-mono">{miningProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={miningProgress} className="w-full" />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Mining Balance:</span>
                      <span className="text-lg font-mono text-orange-600">
                        ₿ {(miningSession?.mining_balance || 0).toFixed(8)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {miningSession?.status === 'ACTIVE' ? (
                        <Button 
                          onClick={handleStopMining}
                          disabled={isLoading}
                          variant="outline"
                          className="flex-1"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Stop Mining
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleStartMining}
                          disabled={isLoading}
                          className="flex-1 bg-orange-500 hover:bg-orange-600"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Mining
                        </Button>
                      )}
                      
                      <Button 
                        onClick={handleWithdrawMining}
                        disabled={isLoading || !miningSession?.mining_balance}
                        variant="outline"
                        className="flex-1"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Withdraw
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Mining Statistics</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Current BTC Balance:</span>
                        <span className="font-mono">₿ {getBalance('BITCOIN').toFixed(8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Session Started:</span>
                        <span className="text-sm">
                          {miningSession?.started_at ? 
                            miningSession.started_at.toLocaleTimeString() : 
                            'Not started'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Sessions:</span>
                        <span className="text-sm">
                          {transactions.filter(t => t.transaction_type === 'MINING_WITHDRAWAL').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-6 h-6" />
                  Cryptocurrency Balances
                  {demoMode && <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">Demo</Badge>}
                </CardTitle>
                <CardDescription>
                  View all your cryptocurrency holdings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.entries(CRYPTO_INFO).map(([cryptoType, info]) => {
                    const balance = getBalance(cryptoType as CryptoType);
                    return (
                      <Card key={cryptoType} className="relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${info.color}`} />
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{info.emoji}</span>
                            <Badge variant="outline" className="text-xs">
                              {info.symbol}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-sm mb-1">{info.name}</h3>
                          <p className="text-lg font-mono">
                            {balance.toFixed(8)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {info.symbol}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Swap Tab */}
          <TabsContent value="swap" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpDown className="w-6 h-6" />
                  Cryptocurrency Swap
                  {demoMode && <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">Demo</Badge>}
                </CardTitle>
                <CardDescription>
                  Exchange one cryptocurrency for another
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSwap} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="from-crypto">From</Label>
                        <Select 
                          value={swapForm.from_crypto || 'BITCOIN'} 
                          onValueChange={(value: CryptoType) => 
                            setSwapForm(prev => ({ ...prev, from_crypto: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CRYPTO_INFO).map(([crypto, info]) => (
                              <SelectItem key={crypto} value={crypto}>
                                <div className="flex items-center gap-2">
                                  <span>{info.emoji}</span>
                                  <span>{info.name} ({info.symbol})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-gray-500 mt-1">
                          Available: {getBalance(swapForm.from_crypto).toFixed(8)} {CRYPTO_INFO[swapForm.from_crypto].symbol}
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.00000001"
                          min="0"
                          max={getBalance(swapForm.from_crypto)}
                          placeholder="0.00000000"
                          value={swapForm.amount || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSwapForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="to-crypto">To</Label>
                        <Select 
                          value={swapForm.to_crypto || 'ETHEREUM_CLASSIC'} 
                          onValueChange={(value: CryptoType) => 
                            setSwapForm(prev => ({ ...prev, to_crypto: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CRYPTO_INFO).map(([crypto, info]) => (
                              <SelectItem key={crypto} value={crypto}>
                                <div className="flex items-center gap-2">
                                  <span>{info.emoji}</span>
                                  <span>{info.name} ({info.symbol})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Estimated Receive</Label>
                        <div className="h-10 bg-gray-50 border rounded-md flex items-center px-3 text-gray-600">
                          ~{swapForm.amount.toFixed(8)} {CRYPTO_INFO[swapForm.to_crypto].symbol}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          * 1:1 exchange rate (simplified)
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <Button 
                    type="submit" 
                    disabled={isLoading || swapForm.amount <= 0 || swapForm.amount > getBalance(swapForm.from_crypto)}
                    className="w-full"
                  >
                    {isLoading ? 'Processing Swap...' : 'Execute Swap'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-6 h-6" />
                  Transaction History
                  {demoMode && <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">Demo</Badge>}
                </CardTitle>
                <CardDescription>
                  View all your cryptocurrency transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Start mining or swap cryptocurrencies to see transactions here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction: Transaction) => (
                      <Card key={transaction.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                              transaction.transaction_type === 'MINING_WITHDRAWAL' ? 'bg-orange-500' :
                              transaction.transaction_type === 'SWAP_FROM' ? 'bg-red-500' : 'bg-green-500'
                            }`}>
                              {transaction.transaction_type === 'MINING_WITHDRAWAL' ? '⛏️' :
                               transaction.transaction_type === 'SWAP_FROM' ? '↗️' : '↙️'}
                            </div>
                            <div>
                              <p className="font-medium">
                                {transaction.transaction_type === 'MINING_WITHDRAWAL' ? 'Mining Withdrawal' :
                                 transaction.transaction_type === 'SWAP_FROM' ? `Swap From ${CRYPTO_INFO[transaction.crypto_type].name}` :
                                 `Swap To ${CRYPTO_INFO[transaction.crypto_type].name}`}
                              </p>
                              <p className="text-sm text-gray-500">
                                {transaction.created_at.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-mono font-medium ${
                              transaction.transaction_type === 'SWAP_FROM' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {transaction.transaction_type === 'SWAP_FROM' ? '-' : '+'}
                              {transaction.amount.toFixed(8)} {CRYPTO_INFO[transaction.crypto_type].symbol}
                            </p>
                            {transaction.from_crypto_type && transaction.to_crypto_type && (
                              <p className="text-xs text-gray-500">
                                {CRYPTO_INFO[transaction.from_crypto_type].symbol} → {CRYPTO_INFO[transaction.to_crypto_type].symbol}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallets Tab */}
          <TabsContent value="wallets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-6 h-6" />
                  Wallet Addresses
                  {demoMode && <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">Demo</Badge>}
                </CardTitle>
                <CardDescription>
                  Manage your cryptocurrency wallet addresses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add/Update Wallet Form */}
                <form onSubmit={handleSaveWallet} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold">Add/Update Wallet Address</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wallet-crypto">Cryptocurrency</Label>
                      <Select 
                        value={walletForm.crypto_type || 'BITCOIN'} 
                        onValueChange={(value: CryptoType) => 
                          setWalletForm(prev => ({ ...prev, crypto_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CRYPTO_INFO).map(([crypto, info]) => (
                            <SelectItem key={crypto} value={crypto}>
                              <div className="flex items-center gap-2">
                                <span>{info.emoji}</span>
                                <span>{info.name} ({info.symbol})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="wallet-address">Wallet Address</Label>
                      <Input
                        id="wallet-address"
                        placeholder="Enter wallet address"
                        value={walletForm.address}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setWalletForm(prev => ({ ...prev, address: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading || !walletForm.address.trim()}>
                    {isLoading ? 'Saving...' : 'Save Address'}
                  </Button>
                </form>

                <Separator />

                {/* Saved Wallet Addresses */}
                <div>
                  <h3 className="font-semibold mb-4">Saved Addresses</h3>
                  {walletAddresses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No saved wallet addresses</p>
                      <p className="text-sm">Add wallet addresses above to manage your crypto destinations</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {walletAddresses.map((wallet: WalletAddress) => (
                        <Card key={wallet.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{CRYPTO_INFO[wallet.crypto_type].emoji}</span>
                              <div>
                                <p className="font-medium">{CRYPTO_INFO[wallet.crypto_type].name}</p>
                                <p className="text-sm text-gray-500 font-mono break-all">
                                  {wallet.address}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">
                              {CRYPTO_INFO[wallet.crypto_type].symbol}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
