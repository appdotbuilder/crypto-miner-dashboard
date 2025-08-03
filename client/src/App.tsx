
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

// Crypto display names and emojis for better UX
const CRYPTO_INFO: Record<CryptoType, { name: string; emoji: string; color: string }> = {
  BITCOIN: { name: 'Bitcoin', emoji: '₿', color: 'text-orange-500' },
  BITCOIN_GREEN: { name: 'Bitcoin Green', emoji: '🌱', color: 'text-green-500' },
  BITCOIN_CASH: { name: 'Bitcoin Cash', emoji: '💚', color: 'text-green-600' },
  ETHEREUM_CLASSIC: { name: 'Ethereum Classic', emoji: '⚡', color: 'text-blue-500' },
  BINANCE_COIN: { name: 'Binance Coin', emoji: '🟡', color: 'text-yellow-500' },
  SOLANA: { name: 'Solana', emoji: '☀️', color: 'text-purple-500' },
  TON: { name: 'TON', emoji: '💎', color: 'text-blue-400' },
  NOTCOIN: { name: 'Notcoin', emoji: '🚫', color: 'text-gray-500' },
  DOGECOIN: { name: 'Dogecoin', emoji: '🐕', color: 'text-yellow-600' },
  TRUMP: { name: 'TRUMP', emoji: '🇺🇸', color: 'text-red-500' },
  TETHER: { name: 'Tether', emoji: '💵', color: 'text-green-700' },
  LITECOIN: { name: 'Litecoin', emoji: '🥈', color: 'text-gray-400' }
};

function App() {
  // Current user state - initialized immediately
  const [currentUser] = useState<User>({
    id: 1,
    created_at: new Date()
  });
  
  // Mining state
  const [miningSession, setMiningSession] = useState<MiningSession>({
    id: 1,
    user_id: 1,
    status: 'STOPPED',
    mining_balance: 0.00123456,
    started_at: null,
    stopped_at: new Date(),
    created_at: new Date()
  });
  const [miningProgress, setMiningProgress] = useState(0);
  
  // Balance state - initialized with sample data
  const [balances, setBalances] = useState<Balance[]>([
    {
      id: 1,
      user_id: 1,
      crypto_type: 'BITCOIN',
      amount: 0.05432100,
      updated_at: new Date()
    },
    {
      id: 2,
      user_id: 1,
      crypto_type: 'ETHEREUM_CLASSIC',
      amount: 12.34567890,
      updated_at: new Date()
    },
    {
      id: 3,
      user_id: 1,
      crypto_type: 'DOGECOIN',
      amount: 1000.00000000,
      updated_at: new Date()
    }
  ]);
  
  // Transactions state - initialized with sample data
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 1,
      user_id: 1,
      transaction_type: 'MINING_WITHDRAWAL',
      crypto_type: 'BITCOIN',
      amount: 0.00100000,
      from_crypto_type: null,
      to_crypto_type: null,
      created_at: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      id: 2,
      user_id: 1,
      transaction_type: 'SWAP_FROM',
      crypto_type: 'BITCOIN',
      amount: 0.01000000,
      from_crypto_type: 'BITCOIN',
      to_crypto_type: 'ETHEREUM_CLASSIC',
      created_at: new Date(Date.now() - 3600000) // 1 hour ago
    },
    {
      id: 3,
      user_id: 1,
      transaction_type: 'SWAP_TO',
      crypto_type: 'ETHEREUM_CLASSIC',
      amount: 0.25000000,
      from_crypto_type: 'BITCOIN',
      to_crypto_type: 'ETHEREUM_CLASSIC',
      created_at: new Date(Date.now() - 3600000) // 1 hour ago
    }
  ]);
  
  // Wallet addresses state - initialized with sample data
  const [walletAddresses, setWalletAddresses] = useState<WalletAddress[]>([
    {
      id: 1,
      user_id: 1,
      crypto_type: 'BITCOIN',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      created_at: new Date(Date.now() - 604800000), // 1 week ago
      updated_at: new Date(Date.now() - 604800000)
    },
    {
      id: 2,
      user_id: 1,
      crypto_type: 'ETHEREUM_CLASSIC',
      address: '0x742d35Cc6634C0532925a3b8D84D11E59bb24561',
      created_at: new Date(Date.now() - 86400000), // 1 day ago
      updated_at: new Date(Date.now() - 86400000)
    }
  ]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isMiningActionLoading, setIsMiningActionLoading] = useState(false);
  
  // Swap form state
  const [swapForm, setSwapForm] = useState<Omit<SwapCryptoInput, 'user_id'>>({
    from_crypto: 'BITCOIN',
    to_crypto: 'ETHEREUM_CLASSIC',
    amount: 0
  });
  
  // Wallet form state
  const [walletForm, setWalletForm] = useState<Omit<SaveWalletAddressInput, 'user_id'>>({
    crypto_type: 'BITCOIN',
    address: ''
  });

  // Mining progress simulation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (miningSession.status === 'ACTIVE') {
      interval = setInterval(() => {
        setMiningProgress((prev: number) => {
          const newProgress = prev + Math.random() * 2;
          return newProgress > 100 ? 0 : newProgress;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [miningSession.status]);

  // Mining actions
  const handleStartMining = useCallback(async () => {
    setIsMiningActionLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setMiningSession(prev => ({ 
      ...prev, 
      status: 'ACTIVE', 
      started_at: new Date() 
    }));
    setMiningProgress(0);
    
    setIsMiningActionLoading(false);
  }, []);

  const handleStopMining = useCallback(async () => {
    setIsMiningActionLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setMiningSession(prev => ({ 
      ...prev, 
      status: 'STOPPED', 
      stopped_at: new Date(),
      mining_balance: prev.mining_balance + Math.random() * 0.001
    }));
    
    setIsMiningActionLoading(false);
  }, []);

  const handleWithdrawMining = useCallback(async () => {
    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const withdrawAmount = miningSession.mining_balance;
    
    setMiningSession(prev => ({ ...prev, mining_balance: 0 }));
    setBalances(prev => prev.map(b => 
      b.crypto_type === 'BITCOIN' 
        ? { ...b, amount: b.amount + withdrawAmount, updated_at: new Date() }
        : b
    ));
    setTransactions(prev => [{
      id: Date.now(),
      user_id: currentUser.id,
      transaction_type: 'MINING_WITHDRAWAL',
      crypto_type: 'BITCOIN',
      amount: withdrawAmount,
      from_crypto_type: null,
      to_crypto_type: null,
      created_at: new Date()
    }, ...prev]);
    
    setIsLoading(false);
  }, [miningSession.mining_balance, currentUser.id]);

  // Swap crypto
  const handleSwapCrypto = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (swapForm.amount <= 0) return;
    
    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const fromBalance = balances.find(b => b.crypto_type === swapForm.from_crypto);
    if (!fromBalance || fromBalance.amount < swapForm.amount) {
      alert('Insufficient balance');
      setIsLoading(false);
      return;
    }
    
    // Simple 1:1 swap rate for demonstration
    const toAmount = swapForm.amount;
    
    setBalances(prev => prev.map(b => {
      if (b.crypto_type === swapForm.from_crypto) {
        return { ...b, amount: b.amount - swapForm.amount, updated_at: new Date() };
      }
      if (b.crypto_type === swapForm.to_crypto) {
        return { ...b, amount: b.amount + toAmount, updated_at: new Date() };
      }
      return b;
    }));

    // Add transaction records
    const now = new Date();
    setTransactions(prev => [
      {
        id: Date.now(),
        user_id: currentUser.id,
        transaction_type: 'SWAP_FROM',
        crypto_type: swapForm.from_crypto,
        amount: swapForm.amount,
        from_crypto_type: swapForm.from_crypto,
        to_crypto_type: swapForm.to_crypto,
        created_at: now
      },
      {
        id: Date.now() + 1,
        user_id: currentUser.id,
        transaction_type: 'SWAP_TO',
        crypto_type: swapForm.to_crypto,
        amount: toAmount,
        from_crypto_type: swapForm.from_crypto,
        to_crypto_type: swapForm.to_crypto,
        created_at: now
      },
      ...prev
    ]);

    setSwapForm(prev => ({ ...prev, amount: 0 }));
    setIsLoading(false);
  }, [swapForm, balances, currentUser.id]);

  // Save wallet address
  const handleSaveWalletAddress = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletForm.address.trim()) return;
    
    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newWallet: WalletAddress = {
      id: Date.now(),
      user_id: currentUser.id,
      crypto_type: walletForm.crypto_type,
      address: walletForm.address,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    setWalletAddresses(prev => {
      // Update existing or add new
      const existingIndex = prev.findIndex(w => w.crypto_type === walletForm.crypto_type);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], address: walletForm.address, updated_at: new Date() };
        return updated;
      }
      return [newWallet, ...prev];
    });
    
    setWalletForm(prev => ({ ...prev, address: '' }));
    setIsLoading(false);
  }, [walletForm, currentUser.id]);

  // Get balance for specific crypto
  const getBalanceForCrypto = useCallback((cryptoType: CryptoType): number => {
    const balance = balances.find((b: Balance) => b.crypto_type === cryptoType);
    return balance?.amount || 0;
  }, [balances]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent mb-2">
            ⛏️ Crypto Mining Dashboard
          </h1>
          <p className="text-gray-600">Mine, swap, and manage your cryptocurrency portfolio</p>
        </div>

        {/* Demo Mode Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            🚀 <strong>Demo Mode:</strong> This is a fully functional demonstration of the cryptocurrency mining dashboard. 
            All features work with local data simulation.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="mining" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="mining">⛏️ Mining</TabsTrigger>
            <TabsTrigger value="balances">💰 Balances</TabsTrigger>
            <TabsTrigger value="swap">🔄 Swap</TabsTrigger>
            <TabsTrigger value="history">📊 History</TabsTrigger>
            <TabsTrigger value="wallets">🏦 Wallets</TabsTrigger>
          </TabsList>

          {/* Mining Tab */}
          <TabsContent value="mining">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ₿ Bitcoin Mining
                  {miningSession.status === 'ACTIVE' && (
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  )}
                  {miningSession.status === 'STOPPED' && (
                    <Badge variant="secondary">Stopped</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Start mining Bitcoin and track your progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mining Progress */}
                {miningSession.status === 'ACTIVE' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Mining Progress</span>
                      <span>{miningProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={miningProgress} className="h-2" />
                  </div>
                )}

                {/* Mining Balance */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Mining Balance</span>
                    <span className="text-2xl font-bold text-orange-600">
                      ₿ {miningSession.mining_balance.toFixed(8)}
                    </span>
                  </div>
                </div>

                {/* Mining Controls */}
                <div className="flex gap-2">
                  {miningSession.status !== 'ACTIVE' ? (
                    <Button 
                      onClick={handleStartMining}
                      disabled={isMiningActionLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isMiningActionLoading ? 'Starting...' : '▶️ Start Mining'}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStopMining}
                      disabled={isMiningActionLoading}
                      variant="destructive"
                    >
                      {isMiningActionLoading ? 'Stopping...' : '⏹️ Stop Mining'}
                    </Button>
                  )}
                  
                  {miningSession.mining_balance > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">
                          💰 Withdraw Balance
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Withdraw Mining Balance</AlertDialogTitle>
                          <AlertDialogDescription>
                            Transfer ₿ {miningSession.mining_balance.toFixed(8)} from mining balance to your Bitcoin wallet?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleWithdrawMining}>
                            Withdraw
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(CRYPTO_INFO).map(([crypto, info]) => {
                const balance = getBalanceForCrypto(crypto as CryptoType);
                return (
                  <Card key={crypto} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{info.emoji}</span>
                          <div>
                            <div className="font-medium">{info.name}</div>
                            <div className="text-xs text-gray-500">{crypto}</div>
                          </div>
                        </div>
                        <div className={`text-right ${info.color}`}>
                          <div className="font-bold text-lg">
                            {balance.toFixed(8)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Swap Tab */}
          <TabsContent value="swap">
            <Card>
              <CardHeader>
                <CardTitle>🔄 Cryptocurrency Swap</CardTitle>
                <CardDescription>
                  Exchange one cryptocurrency for another
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSwapCrypto} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
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
                              {info.emoji} {info.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-sm text-gray-500">
                        Available: {getBalanceForCrypto(swapForm.from_crypto).toFixed(8)}
                      </div>
                    </div>

                    <div className="space-y-2">
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
                              {info.emoji} {info.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.00000001"
                      min="0"
                      value={swapForm.amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSwapForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                      }
                      placeholder="Enter amount to swap"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading || swapForm.amount <= 0 || swapForm.from_crypto === swapForm.to_crypto}
                    className="w-full"
                  >
                    {isLoading ? 'Swapping...' : '🔄 Swap Cryptocurrencies'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>📊 Transaction History</CardTitle>
                <CardDescription>
                  View all your mining withdrawals and swaps
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📭</div>
                    <p>No transactions yet. Start mining or make a swap!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction: Transaction) => (
                      <div key={transaction.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {transaction.transaction_type === 'MINING_WITHDRAWAL' && (
                                <Badge className="bg-green-100 text-green-800">⛏️ Mining Withdrawal</Badge>
                              )}
                              {transaction.transaction_type === 'SWAP_FROM' && (
                                <Badge className="bg-blue-100 text-blue-800">🔄 Swap From</Badge>
                              )}
                              {transaction.transaction_type === 'SWAP_TO' && (
                                <Badge className="bg-purple-100 text-purple-800">🔄 Swap To</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {transaction.created_at.toLocaleDateString()} at {transaction.created_at.toLocaleTimeString()}
                            </div>
                            {transaction.from_crypto_type && transaction.to_crypto_type && (
                              <div className="text-sm">
                                {CRYPTO_INFO[transaction.from_crypto_type].emoji} {CRYPTO_INFO[transaction.from_crypto_type].name} → {CRYPTO_INFO[transaction.to_crypto_type].emoji} {CRYPTO_INFO[transaction.to_crypto_type].name}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {CRYPTO_INFO[transaction.crypto_type].emoji} {transaction.amount.toFixed(8)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {CRYPTO_INFO[transaction.crypto_type].name}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallets Tab */}
          <TabsContent value="wallets">
            <div className="space-y-6">
              {/* Add Wallet Form */}
              <Card>
                <CardHeader>
                  <CardTitle>🏦 Save Wallet Address</CardTitle>
                  <CardDescription>
                    Add your wallet addresses for different cryptocurrencies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveWalletAddress} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
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
                                {info.emoji} {info.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="wallet-address">Wallet Address</Label>
                        <Input
                          id="wallet-address"
                          value={walletForm.address}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setWalletForm(prev => ({ ...prev, address: e.target.value }))
                          }
                          placeholder="Enter wallet address"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isLoading || !walletForm.address.trim()}
                    >
                      {isLoading ? 'Saving...' : '💾 Save Wallet Address'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Saved Wallets */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Saved Wallets</CardTitle>
                </CardHeader>
                <CardContent>
                  {walletAddresses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🏦</div>
                      <p>No wallet addresses saved yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {walletAddresses.map((wallet: WalletAddress) => (
                        <div key={wallet.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">
                                {CRYPTO_INFO[wallet.crypto_type].emoji}
                              </span>
                              <div>
                                <div className="font-medium">
                                  {CRYPTO_INFO[wallet.crypto_type].name}
                                </div>
                                <div className="text-sm text-gray-500 font-mono">
                                  {wallet.address}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-400">
                              Saved {wallet.created_at.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
