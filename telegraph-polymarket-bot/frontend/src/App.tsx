import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Activity,
  Zap,
  Globe,
  AlertCircle,
  TrendingUp,
  Settings,
  Search,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Wallet,
  Copy,
  PlusCircle,
  X,
  ArrowRight,
  Crown,
  Check,
  TrendingDown,
  Clock,
  ExternalLink,
  ShoppingCart,
  BadgeCheck
} from 'lucide-react'
import { motion } from 'framer-motion'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance, useChainId, useSwitchChain, useWalletClient, usePublicClient } from 'wagmi'
import { useDisconnect } from 'wagmi'
import { erc20Abi, parseUnits } from 'viem'
import BackgroundAnimation from './components/BackgroundAnimation'
import TerminalFeed, { type PipelineRunResult } from './components/TerminalFeed'
import api from './utils/api'
import { useAuth } from './hooks/useAuth'
import { assertSubscriptionConfig, SUBSCRIPTION_PLANS, subscriptionConfig } from './utils/subscription'
import type { SubscriptionPlanId } from './utils/subscription'
import './App.css'

type DecisionHistoryItem = {
  id: string
  keyword: string
  marketTitle: string
  action: 'buy' | 'wait'
  token: 'YES' | 'NO' | null
  likelihood: number
  reason: string
  liquidity: string
  volume: string
  createdAt: string
  groqTxHash: string | null
  llmTxHash: string | null
}

function App() {
  const SUBSCRIPTION_CHAIN_ID = subscriptionConfig.chainId
  const SUBSCRIPTION_TOKEN_ADDRESS = subscriptionConfig.tokenAddress

  const [isTrading, setIsTrading] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [hasWallet, setHasWallet] = useState(false)
  const [custodialAddress, setCustodialAddress] = useState('')
  const [amounts, setAmounts] = useState({ deposit: '', withdraw: '' })
  const [loaderText, setLoaderText] = useState({ title: '', sub: '' })
  const [showError, setShowError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [currentView, setCurrentView] = useState<'dashboard' | 'subscription'>('dashboard')
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [activePlanId, setActivePlanId] = useState<SubscriptionPlanId | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [decisionHistory, setDecisionHistory] = useState<DecisionHistoryItem[]>([])
  const [decisionHistoryLoading, setDecisionHistoryLoading] = useState(false)
  const [decisionHistoryError, setDecisionHistoryError] = useState('')
  const [decisionHistoryPage, setDecisionHistoryPage] = useState(1)
  const [decisionHistoryLimit] = useState(5)
  const [decisionHistoryTotalPages, setDecisionHistoryTotalPages] = useState(1)
  const [decisionHistorySortDir, setDecisionHistorySortDir] = useState<'asc' | 'desc'>('desc')
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [pipelineData, setPipelineData] = useState<PipelineRunResult | null>(null)
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [simUsdcBalance, setSimUsdcBalance] = useState<string | null>(null)
  const [simPolBalance, setSimPolBalance] = useState<string | null>(null)
  const [tradeHistoryPage, setTradeHistoryPage] = useState(0)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient({ chainId: SUBSCRIPTION_CHAIN_ID })

  const { isLoggedIn, isAuthenticating, user: authUser, logout, checkStatus } = useAuth()

  const { data: ethBalance } = useBalance({
    address: address,
  })

  const { data: polBalance } = useBalance({
    address: custodialAddress as `0x${string}`,
    query: { enabled: !!custodialAddress }
  })

  const { data: usdcBalance } = useBalance({
    address: custodialAddress as `0x${string}`,
    token: SUBSCRIPTION_TOKEN_ADDRESS,
    query: { enabled: !!custodialAddress && !!SUBSCRIPTION_TOKEN_ADDRESS }
  })

  const { data: usdcWeb3Balance } = useBalance({
    address: address as `0x${string}`,
    token: SUBSCRIPTION_TOKEN_ADDRESS,
    query: { enabled: !!address && !!SUBSCRIPTION_TOKEN_ADDRESS }
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccessMsg('Address Copied!')
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
    }, 1500)
  }

  const addTokenToWallet = async () => {
    if (!SUBSCRIPTION_TOKEN_ADDRESS) {
      showErrorToast('Subscription token address is not configured')
      return
    }

    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: SUBSCRIPTION_TOKEN_ADDRESS,
              symbol: 'USDC',
              decimals: subscriptionConfig.tokenDecimals,
              image: '/logos/usd-coin-usdc-logo.png',
            },
          },
        });
      } catch (error) {
        console.error(error);
      }
    }
  }

  const showErrorToast = (message: string) => {
    setErrorMsg(message)
    setShowError(true)
    setTimeout(() => setShowError(false), 2500)
  }

  const refreshSubscriptionStatus = useCallback(async () => {
    if (!isLoggedIn) {
      setHasActiveSubscription(false)
      setActivePlanId(null)
      return
    }

    try {
      const { data } = await api.get('/subscription/status')
      const isActive = Boolean(data?.active)
      setHasActiveSubscription(isActive)
      setActivePlanId(isActive ? (data.planId as SubscriptionPlanId) : null)
    } catch (error) {
      console.error('Subscription status fetch failed:', error)
      setHasActiveSubscription(false)
      setActivePlanId(null)
    }
  }, [isLoggedIn])

  const refreshBotStatus = useCallback(async () => {
    if (!isLoggedIn) {
      setIsTrading(false)
      return
    }

    try {
      const { data } = await api.get('/user/status')
      setIsTrading(Boolean(data?.botEnabled))
    } catch (error) {
      console.error('Bot status fetch failed:', error)
    }
  }, [isLoggedIn])

  const refreshDecisionHistory = useCallback(async () => {
    if (!isLoggedIn) {
      setDecisionHistory([])
      setDecisionHistoryError('')
      setDecisionHistoryTotalPages(1)
      return
    }

    try {
      setDecisionHistoryLoading(true)
      setDecisionHistoryError('')
      const { data } = await api.get('/pipeline/history', {
        params: {
          page: decisionHistoryPage,
          limit: decisionHistoryLimit,
          sortBy: 'createdAt',
          sortDir: decisionHistorySortDir,
        },
      })
      setDecisionHistory(Array.isArray(data?.items) ? data.items : [])
      setDecisionHistoryTotalPages(Math.max(1, Number(data?.totalPages) || 1))
    } catch (error: any) {
      console.error('Decision history fetch failed:', error)
      const apiError = error?.response?.data?.error || 'Failed to load decision history'
      setDecisionHistoryError(apiError)
      setDecisionHistory([])
    } finally {
      setDecisionHistoryLoading(false)
    }
  }, [decisionHistoryLimit, decisionHistoryPage, decisionHistorySortDir, isLoggedIn])

  const keywords = ['Fuel Prices', 'Global Conflict', 'Strait of Hormuz', 'US Election', 'Interest Rates']

  const positions = [
    { id: 1, market: 'US Election 2024', outcome: 'YES', shares: 450, value: '$0.52', pnl: '+12.4%', type: 'up' },
    { id: 2, market: 'Interest Rate Cut', outcome: 'NO', shares: 1200, value: '$0.31', pnl: '-2.1%', type: 'down' },
  ]

  // Auth sync and data fetching
  useEffect(() => {
    if (isLoggedIn && authUser) {
      setHasWallet(authUser.hasWallet);
      if (authUser.custodialAddress) setCustodialAddress(authUser.custodialAddress);
    } else {
      setHasWallet(false);
      setCustodialAddress('');
      setHasActiveSubscription(false);
      setActivePlanId(null);
      setIsTrading(false);
      setDecisionHistoryPage(1);
    }
  }, [isLoggedIn, authUser]);

  useEffect(() => {
    refreshSubscriptionStatus()
    refreshBotStatus()
  }, [refreshSubscriptionStatus, refreshBotStatus])

  useEffect(() => {
    refreshDecisionHistory()
  }, [refreshDecisionHistory])

  // Redundant functions removed: initAuth, handleLogin, checkWalletStatus

  const handleCreateWallet = async () => {
    try {
      setShowJoinModal(false);
      setLoaderText({ title: 'Generating Custodial Wallet', sub: 'Syncing with Telegraph Subnets...' });
      setIsLoading(true);

      await api.post('/wallet/create');
      
      // Refresh global auth status to sync hasWallet and address across the app
      await checkStatus();
      setIsLoading(false);
      setSuccessMsg('Wallet Ready!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (error) {
      console.error('Wallet creation failed:', error);
      setIsLoading(false);
    }
  };


  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const { data } = await api.get(`/polymarket/search`, {
        params: { q: searchQuery }
      });
      const activeMarkets = (data.markets || []).filter((market: any) => market?.active === true);
      setSearchResults(activeMarkets.slice(0, 3));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBotToggle = async () => {
    if (!isConnected) return
    if (!hasActiveSubscription) {
      showErrorToast('Subscription Required')
      return
    }

    try {
      const { data } = await api.post('/bot/toggle', { enabled: !isTrading })
      setIsTrading(Boolean(data?.botEnabled))
    } catch (error: any) {
      const apiError = error?.response?.data?.error || 'Failed to update bot status'
      showErrorToast(apiError)
    }
  }

  const handleSubscribe = async (planId: SubscriptionPlanId) => {
    if (!isConnected || !address) {
      showErrorToast('Connect wallet first')
      return
    }

    if (!isLoggedIn) {
      showErrorToast('Authenticate wallet first')
      return
    }

    try {
      assertSubscriptionConfig()
    } catch (error: any) {
      showErrorToast(error.message || 'Subscription env config is missing')
      return
    }

    if (!walletClient || !publicClient) {
      showErrorToast('Wallet client is not ready')
      return
    }

    try {
      if (chainId !== SUBSCRIPTION_CHAIN_ID) {
        await switchChainAsync({ chainId: SUBSCRIPTION_CHAIN_ID })
      }

      const selectedPlan = SUBSCRIPTION_PLANS[planId]
      const amount = parseUnits(selectedPlan.priceUsd.toString(), subscriptionConfig.tokenDecimals)

      setLoaderText({ title: `Paying for ${selectedPlan.label}`, sub: 'Approve token transfer in your wallet...' })
      setIsLoading(true)

      const txHash = await walletClient.writeContract({
        address: subscriptionConfig.tokenAddress!,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [subscriptionConfig.treasuryWallet!, amount],
      })

      setLoaderText({ title: 'Confirming Payment', sub: 'Waiting for chain confirmation...' })
      await publicClient.waitForTransactionReceipt({ hash: txHash })

      await api.post('/subscription/activate', { planId, txHash })
      await refreshSubscriptionStatus()

      setSuccessMsg(`${selectedPlan.label} Plan Activated!`)
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setCurrentView('dashboard')
      }, 2000)
    } catch (error: any) {
      const apiError = error?.response?.data?.error
      showErrorToast(apiError || error?.shortMessage || error?.message || 'Subscription payment failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunPipeline = async () => {
    setPipelineData(null)
    setPipelineError(null)
    setPipelineRunning(true)
    try {
      const { data } = await api.post('/pipeline/test-run')
      setPipelineData(data as PipelineRunResult)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Pipeline run failed'
      setPipelineError(msg)
    } finally {
      setPipelineRunning(false)
    }
  }

  return (
    <div className="app-container">
      <BackgroundAnimation />
      <header className="header glass">
        <div className="logo-section">
          <div className="logo-icon animate-glow" style={{ color: 'var(--primary-color)' }}>
            <Zap size={28} fill="currentColor" />
          </div>
          <div className="logo-group">
            <span className="logo-text">SNIPER BOT</span>
            <span className="powered-by">Powered by Telegraph</span>
          </div>
        </div>

        <nav className="header-nav">
          <button 
            className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`} 
            onClick={() => setCurrentView('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-link ${currentView === 'subscription' ? 'active' : ''}`} 
            onClick={() => setCurrentView('subscription')}
          >
            {hasActiveSubscription ? 'Premium Plan' : 'Subscription'}
          </button>
        </nav>

        <div className="nav-right">
          <div className="status-indicator">
            {isConnected && chainId !== SUBSCRIPTION_CHAIN_ID && (
              <button
                className="network-switch-btn animate-glow"
                onClick={() => switchChain({ chainId: SUBSCRIPTION_CHAIN_ID })}
              >
                <AlertCircle size={14} />
                Switch to Amoy
              </button>
            )}
            <span className={`status-badge ${isTrading && isConnected && chainId === SUBSCRIPTION_CHAIN_ID ? 'status-active' : 'status-inactive'}`}>
              {!isConnected ? 'Wallet Required' : chainId !== SUBSCRIPTION_CHAIN_ID ? 'Wrong Network' : isTrading ? 'Bot Active' : 'Bot Idle'}
            </span>
          </div>
          {isConnected ? (
            <>
              <button className="wallet-state-btn">
                Connected: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Wallet'}
              </button>
              <button className="disconnect-wallet-btn" onClick={() => disconnect()}>
                Disconnect
              </button>
            </>
          ) : (
            <ConnectButton
              accountStatus="address"
              showBalance={false}
              chainStatus="none"
            />
          )}
          {isLoggedIn && (
            <button className="icon-btn logout-btn" onClick={logout} title="Logout">
              <span className="text-xs mr-2">Logout</span>
            </button>
          )}
          <button className="icon-btn" onClick={() => setShowProfileModal(true)}>
            <User size={20} color={showProfileModal ? "var(--primary-color)" : "var(--text-muted)"} />
          </button>
          <button className="icon-btn">
            <Settings size={20} color="var(--text-muted)" />
          </button>
        </div>
      </header>

      <main className="main-content">
        {currentView === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="dashboard-grid"
          >
            <div className="col-span-12 stats-grid">
              <div className="stat-item glass advantage-card" style={{ borderLeft: '3px solid var(--primary-color)', minHeight: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="stat-label" style={{ color: 'var(--primary-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={14} /> DEEPTRUTH LEAD
                </span>
                <div className="stat-value" style={{ fontSize: '0.9rem', lineHeight: 1.4, marginTop: '4px', fontWeight: 500 }}>
                  Verifying news <span className="price-up">4X faster</span> than retail consensus
                </div>
              </div>
              <div className="stat-item glass">
                <span className="stat-label">Verified Opportunities</span>
                <div className="stat-value">842</div>
              </div>
              <div className="stat-item glass">
                <span className="stat-label">Success Rate</span>
                <div className="stat-value price-up">92.4%</div>
              </div>
              <div className="stat-item glass">
                <span className="stat-label">Web3 Wallet Balance</span>
                <div className="stat-value">
                  <div className="dual-balance-display">
                    <div className="balance-row">
                      <img src="/logos/polygon-matic-logo.png" className="token-logo-stat" alt="POL" />
                      <span>{isConnected ? `${ethBalance?.formatted.slice(0, 6)}` : '0.00'} <small>POL</small></span>
                    </div>
                    <div className="balance-row secondary">
                      <img src="/logos/usd-coin-usdc-logo.png" className="token-logo-stat" alt="USDC" />
                      <span>{isConnected && usdcWeb3Balance ? parseFloat(usdcWeb3Balance.formatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} <small>USDC</small></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Discovery Engine */}
            <div className="col-span-8">
              <div className="search-section glass">
                <div className="search-header">
                  <div className="card-title">
                    <Globe size={20} color="var(--primary-color)" />
                    Live Market Discovery
                  </div>
                  <div className="source-tag">Gamma API</div>
                </div>

                <form onSubmit={handleSearch} className="search-bar">
                  <div className="search-input-wrap">
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="Search Polymarket (e.g. Trump, Crypto, Oil...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="primary-btn"
                    disabled={isSearching}
                    style={{ whiteSpace: 'nowrap', width: 'auto', padding: '0 24px' }}
                  >
                    {isSearching ? <Activity size={18} className="loader-spin" /> : 'Search Markets'}
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="market-results-list">
                    {searchResults.slice(0, 3).map((market, idx) => (
                      <motion.a
                        key={idx}
                        href={market.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="market-card"
                      >
                        <div className="market-title">{market.title}</div>
                        <div className="market-stats">
                          <div className="market-stats-row">
                            <div className="market-badge outcome yes">
                              YES: {market.yesPrice || 'N/A'}
                            </div>
                            <div className="market-badge outcome no">
                              NO: {market.noPrice || 'N/A'}
                            </div>
                          </div>
                          <div className="market-stats-row mt-2">
                            <div className="market-badge metric">
                              <Zap size={11} />
                              <span>Liq: {market.liquidity}</span>
                            </div>
                            <div className="market-badge metric volume">
                              <TrendingUp size={11} />
                              <span>Vol: {market.volume}</span>
                            </div>
                          </div>
                        </div>
                      </motion.a>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && !isSearching && searchQuery && (
                  <div className="no-results">
                    No active markets found for "{searchQuery}"
                  </div>
                )}
              </div>

              {import.meta.env.DEV && (
                <div className="card glass">
                  <div className="card-header">
                    <div className="card-title">
                      <Shield size={20} color="var(--primary-color)" />
                      Telegraph Pipeline
                    </div>
                    <span className="source-tag">DEV</span>
                  </div>
                  <button
                    className="primary-btn mt-2"
                    onClick={handleRunPipeline}
                    disabled={pipelineRunning}
                  >
                    {pipelineRunning ? <Activity size={18} className="loader-spin" /> : null}
                    {pipelineRunning ? 'Running Pipeline...' : '⚙ Run Pipeline'}
                  </button>
                  <TerminalFeed
                    loading={pipelineRunning}
                    data={pipelineData}
                    error={pipelineError}
                    onComplete={() => void refreshDecisionHistory()}
                  />
                </div>
              )}

              <div className="card glass" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                  <div className="card-title">
                    <Activity size={20} color="var(--primary-color)" />
                    Decision History
                  </div>
                  <button
                    className="history-sort-btn"
                    onClick={() => setDecisionHistorySortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  >
                    Time: {decisionHistorySortDir === 'desc' ? 'Newest' : 'Oldest'}
                  </button>
                </div>

                {decisionHistoryError && (
                  <div className="history-status history-error">{decisionHistoryError}</div>
                )}
                {decisionHistoryLoading && (
                  <div className="history-status">Loading decision history...</div>
                )}
                {!decisionHistoryLoading && !decisionHistoryError && decisionHistory.length === 0 && (
                  <div className="history-status">No decisions yet. Run the pipeline to populate history.</div>
                )}

                {!decisionHistoryLoading && decisionHistory.length > 0 && (
                  <div className="history-table-wrap">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Keyword</th>
                          <th>Market</th>
                          <th>Action</th>
                          <th>Token</th>
                          <th>Confidence</th>
                          <th>Reason</th>
                          <th>Liq / Vol</th>
                          <th title="Groq news search payment">Proof · Groq</th>
                          <th title="LLM decision payment">Proof · LLM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {decisionHistory.map((item) => {
                          const pct = Math.round((item.likelihood || 0) * 100)
                          const likelihoodColor = pct >= 70 ? '#4ade80' : pct >= 45 ? '#facc15' : '#f87171'
                          return (
                          <tr key={item.id}>
                            <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                              {new Date(item.createdAt).toLocaleString()}
                            </td>
                            <td>
                              <span className="dt-keyword-tag">{item.keyword}</span>
                            </td>
                            <td title={item.marketTitle} style={{ maxWidth: '180px' }}>
                              <span className="dt-market-title">{item.marketTitle.length > 42 ? item.marketTitle.slice(0, 42) + '…' : item.marketTitle}</span>
                            </td>
                            <td>
                              <span className={`history-action ${item.action}`}>
                                {item.action === 'buy'
                                  ? <><TrendingUp size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />BUY</>
                                  : <><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />WAIT</>
                                }
                              </span>
                            </td>
                            <td>
                              {item.token
                                ? <span className={`dt-token-badge ${item.token.toLowerCase()}`}>{item.token}</span>
                                : <span className="tx-hash-none">—</span>
                              }
                            </td>
                            <td>
                              <div className="dt-likelihood-wrap">
                                <div className="dt-likelihood-bar">
                                  <div className="dt-likelihood-fill" style={{ width: `${pct}%`, background: likelihoodColor }} />
                                </div>
                                <span style={{ color: likelihoodColor, fontWeight: 700, fontSize: '0.72rem' }}>{pct}%</span>
                              </div>
                            </td>
                            <td style={{ maxWidth: '160px' }}>
                              <span
                                className="dt-reason"
                                style={{ cursor: item.reason.length > 60 ? 'help' : 'default' }}
                                onMouseEnter={e => item.reason.length > 60 && setTooltip({ text: item.reason, x: e.clientX, y: e.clientY })}
                                onMouseMove={e => tooltip && setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                                onMouseLeave={() => setTooltip(null)}
                              >
                                {item.reason.length > 60 ? item.reason.slice(0, 60) + '…' : item.reason}
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              <div>{item.liquidity}</div>
                              <div style={{ opacity: 0.6 }}>{item.volume}</div>
                            </td>
                            <td>
                              {item.groqTxHash ? (
                                <a href={`https://explorer.solana.com/tx/${item.groqTxHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="tx-hash-link" title={item.groqTxHash}>
                                  <ExternalLink size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                                  {item.groqTxHash.slice(0, 6)}…{item.groqTxHash.slice(-5)}
                                </a>
                              ) : <span className="tx-hash-none">—</span>}
                            </td>
                            <td>
                              {item.llmTxHash ? (
                                <a href={`https://explorer.solana.com/tx/${item.llmTxHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="tx-hash-link" title={item.llmTxHash}>
                                  <ExternalLink size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                                  {item.llmTxHash.slice(0, 6)}…{item.llmTxHash.slice(-5)}
                                </a>
                              ) : <span className="tx-hash-none">—</span>}
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="history-pagination">
                  <button
                    className="history-page-btn"
                    onClick={() => setDecisionHistoryPage((prev) => Math.max(1, prev - 1))}
                    disabled={decisionHistoryPage <= 1}
                  >
                    Prev
                  </button>
                  <span>
                    Page {decisionHistoryPage} / {decisionHistoryTotalPages}
                  </span>
                  <button
                    className="history-page-btn"
                    onClick={() =>
                      setDecisionHistoryPage((prev) =>
                        Math.min(decisionHistoryTotalPages, prev + 1)
                      )
                    }
                    disabled={decisionHistoryPage >= decisionHistoryTotalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sidebar (Profile + Terminal) */}
            <div className="col-span-4 side-column">
              {/* Compact Profile Section */}
              <div className="profile-card glass">
                {!hasWallet ? (
                  <div className="profile-setup-state">
                    <div className="setup-info">
                      <div className="wallet-avatar-small setup">
                        <PlusCircle size={18} color="var(--primary-color)" />
                      </div>
                      <div className="setup-text">
                        <h3 className="profile-title-small">No Active Wallet</h3>
                        <p className="setup-subtitle">Setup required to start trading</p>
                      </div>
                    </div>
                    <button className="primary-btn w-full mt-4" onClick={() => setShowJoinModal(true)}>
                      Create Trading Wallet
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="profile-header-compact">
                      <div className="profile-info-compact">
                        <div className="wallet-avatar-small">
                          <Wallet size={20} color="var(--primary-color)" />
                        </div>
                        <div className="title-address-group">
                          <h3 className="profile-title-small">Trading Wallet</h3>
                          <div className="compact-address-wrapper">
                            <span className="address-tag-small">
                              {custodialAddress ? `${custodialAddress.slice(0, 6)}...${custodialAddress.slice(-4)}` : '0x...'}
                            </span>
                            <button className="copy-btn-mini" onClick={() => copyToClipboard(custodialAddress)} title="Copy Address">
                              <Copy size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="profile-actions-compact">
                        <button className="action-btn-compact" onClick={() => setShowDeposit(true)}>
                          <ArrowDownLeft size={14} />
                          <span>Deposit via Kraken</span>
                        </button>
                        <button className="action-btn-compact" onClick={() => setShowWithdraw(true)}>
                          <ArrowUpRight size={14} />
                          <span>Withdraw</span>
                        </button>
                      </div>
                    </div>

                    <div className="compact-balances">
                      <div className="compact-balance-item">
                        <div className="balance-label-row">
                          <div className="label-with-logo">
                            <img src="/logos/usd-coin-usdc-logo.png" className="token-logo-mini" alt="USDC" />
                            <span className="balance-label-small">USDC Balance</span>
                          </div>
                          <div className="token-utilities">
                            <button
                              className="token-tool-btn"
                              onClick={() => copyToClipboard(SUBSCRIPTION_TOKEN_ADDRESS || '')}
                              title="Copy Address"
                            >
                              <Copy size={14} />
                            </button>
                            <button className="token-tool-btn highlight" onClick={addTokenToWallet} title="Add to Wallet">
                              <PlusCircle size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="balance-value-small">
                          {simUsdcBalance ?? (usdcBalance ? parseFloat(usdcBalance.formatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00')}
                          <span className="currency-small">USDC</span>
                        </div>
                      </div>
                      <div className="compact-balance-item">
                        <div className="label-with-logo">
                          <img src="/logos/polygon-matic-logo.png" className="token-logo-mini" alt="POL" />
                          <span className="balance-label-small">POL Balance</span>
                        </div>
                        <div className="balance-value-small">
                          {simPolBalance ?? (polBalance ? parseFloat(polBalance.formatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00')}
                          <span className="currency-small">POL</span>
                        </div>
                      </div>
                    </div>

                    <div className="positions-section mt-4">
                      <div className="balance-label-small mb-3">Active Positions</div>
                      <div className="positions-list">
                        {positions.map(pos => (
                          <div key={pos.id} className="position-item-mini">
                            <div className="pos-info-mini">
                              <span className="pos-market-mini">{pos.market}</span>
                              <span className="pos-detail-mini">{pos.shares} shares • {pos.outcome}</span>
                            </div>
                            <div className="pos-pnl-mini">
                              <span className="pos-value-mini">{pos.value}</span>
                              <span className={`pos-percent-mini ${pos.type}`}>{pos.pnl}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="card glass mt-4">
                <div className="card-header">
                  <div className="card-title">
                    <Activity size={20} color="var(--secondary-color)" />
                    Trading Terminal
                  </div>
                </div>

                <div className="control-groups">
                  <div className="toggle-container">
                    <div className="toggle-info" style={{ flex: 1 }}>
                      <div className="activity-name">Automated Sniper</div>
                      <div className="activity-time">Execute positions on verification</div>
                    </div>
                    <button
                      className={`toggle-switch ${isTrading && isConnected ? 'active' : ''}`}
                      onClick={handleBotToggle}
                      disabled={!isConnected}
                      style={{ opacity: isConnected ? 1 : 0.5, cursor: isConnected ? 'pointer' : 'not-allowed' }}
                    >
                      <div className="switch-handle" />
                    </button>
                  </div>

                  {!isConnected && (
                    <div className="status-badge status-inactive mt-2" style={{ textAlign: 'center', fontSize: '0.7rem', marginTop: '12px' }}>
                      Connect wallet to enable trading
                    </div>
                  )}

                  <div className="asset-input mt-4">
                    <div className="stat-label">Trading Limit (per trade)</div>
                    <div className="input-wrap glass">
                      <input type="text" defaultValue="500.00" />
                      <span>USDC</span>
                    </div>
                  </div>
                </div>

                <div className="keywords-section mt-6">
                  <div className="card-title mb-4" style={{ fontSize: '0.875rem' }}>
                    <Globe size={16} /> Monitoring Keywords
                  </div>
                  <div className="keyword-tags">
                    {keywords.map(kw => (
                      <span key={kw} className="keyword-tag">
                        {kw}
                        <CheckCircle2 size={12} className="ml-1" color="var(--success)" />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trade History Simulation */}
              <div className="card glass mt-4">
                <div className="card-header">
                  <div className="card-title">
                    <ShoppingCart size={18} color="var(--primary-color)" />
                    Trade History
                  </div>
                  <span className="source-tag">Polymarket</span>
                </div>

                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BadgeCheck size={12} color="#4ade80" />
                  Auto-executed via Polymarket API · CLOB Engine
                </div>

                {(() => {
                  const trades = decisionHistory.filter(i => i.action === 'buy')
                  const total = trades.length
                  const page = Math.min(tradeHistoryPage, Math.max(0, total - 1))
                  const item = trades[page] ?? null

                  if (total === 0) return (
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textAlign: 'center', padding: '16px 0' }}>
                      No trades executed yet. Run the pipeline to generate buy signals.
                    </div>
                  )

                  // Scale trade size $2–$10 based on confidence
                  const cost = (2 + item.likelihood * 8).toFixed(2)
                  const diff = Date.now() - new Date(item.createdAt).getTime()
                  const mins = Math.floor(diff / 60000)
                  const timeAgo = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`

                  // Deterministic short order ID from item id
                  const orderId = `PM-${item.id.slice(-6).toUpperCase()}`

                  return (
                    <>
                      <div className="trade-history-item">
                        <div className="trade-history-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="trade-filled-badge"><BadgeCheck size={11} /> FILLED</span>
                            <span className={`dt-token-badge ${(item.token ?? 'yes').toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                              BUY {item.token}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{timeAgo}</span>
                        </div>

                        <div className="trade-market-title">{item.marketTitle.length > 52 ? item.marketTitle.slice(0, 52) + '…' : item.marketTitle}</div>

                        <div className="trade-history-meta">
                          <div className="trade-meta-row">
                            <span className="trade-meta-label">Order ID</span>
                            <span className="trade-meta-value" style={{ fontFamily: 'monospace', opacity: 0.7 }}>{orderId}</span>
                          </div>
                          <div className="trade-meta-row">
                            <span className="trade-meta-label">Type</span>
                            <span className="trade-meta-value">MARKET ORDER</span>
                          </div>
                          <div className="trade-meta-row">
                            <span className="trade-meta-label">Cost</span>
                            <span className="trade-meta-value price-up">${cost} USDC</span>
                          </div>
                          <div className="trade-meta-row">
                            <span className="trade-meta-label">Keyword</span>
                            <span className="trade-meta-value"><span className="dt-keyword-tag" style={{ fontSize: '0.6rem' }}>{item.keyword}</span></span>
                          </div>
                        </div>
                      </div>

                      <div className="history-pagination" style={{ marginTop: '10px' }}>
                        <button className="history-page-btn" onClick={() => setTradeHistoryPage(p => Math.max(0, p - 1))} disabled={page <= 0}>Prev</button>
                        <span>{page + 1} / {total}</span>
                        <button className="history-page-btn" onClick={() => setTradeHistoryPage(p => Math.min(total - 1, p + 1))} disabled={page >= total - 1}>Next</button>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="subscription"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="subscription-container"
          >
            <div className="subscription-header">
              <h1 className="subscription-title">Choose Your Power Level</h1>
              <p className="subscription-subtitle">Unlock real-time automated trading powered by Telegraph Subnets</p>
            </div>

            <div className="pricing-grid">
              {/* Starter Plan */}
              <div className="pricing-card glass">
                <div className="plan-name">
                  <Zap size={20} color="var(--text-muted)" />
                  Starter
                </div>
                <div className="plan-price">$20<span>/month</span></div>
                <ul className="plan-features">
                  <li className="feature-item"><Check size={18} color="var(--success)" /> 20 Trades / Month</li>
                  <li className="feature-item"><Check size={18} color="var(--success)" /> Standard Verification Speed</li>
                  <li className="feature-item"><Check size={18} color="var(--success)" /> Multiple Keywords</li>
                  <li className="feature-item muted"><X size={18} color="var(--text-dim)" /> Priority Telegraph Subnets</li>
                  <li className="feature-item muted"><X size={18} color="var(--text-dim)" /> Alpha Whale Signals</li>
                </ul>
                <button 
                  className={`subscribe-btn ${activePlanId === 'starter' ? 'owned' : 'secondary'}`}
                  onClick={() => handleSubscribe('starter')}
                >
                  {activePlanId === 'starter' ? 'Current Plan' : 'Subscribe Now'}
                </button>
              </div>

              {/* Pro Plan - RECOMMENDED */}
              <div className="pricing-card glass recommended">
                <div className="recommended-badge">Most Popular</div>
                <div className="plan-name">
                  <Activity size={20} color="var(--primary-color)" />
                  Pro Sniper
                </div>
                <div className="plan-price">$50<span>/month</span></div>
                <ul className="plan-features">
                  <li className="feature-item"><Check size={18} color="var(--success)" /> 50 Trades / Month</li>
                  <li className="feature-item"><Check size={18} color="var(--success)" /> 4X Faster Lead Time</li>
                  <li className="feature-item"><Check size={18} color="var(--success)" /> Priority Telegraph Subnets</li>
                  <li className="feature-item"><Check size={18} color="var(--success)" /> Advance Discovery Engine</li>
                  <li className="feature-item muted"><X size={18} color="var(--text-dim)" /> Alpha Whale Signals</li>
                </ul>
                <button 
                  className="subscribe-btn primary-btn"
                  onClick={() => handleSubscribe('pro')}
                >
                  {activePlanId === 'pro' ? 'Current Plan' : 'Go Pro'}
                </button>
              </div>

              {/* Whale Plan */}
              <div className="pricing-card glass">
                <div className="plan-name">
                  <Crown size={20} color="var(--secondary-color)" />
                  Alpha Whale
                </div>
                <div className="plan-price">$70<span>/month</span></div>
                <ul className="plan-features">
                  <li className="feature-item"><Check size={18} color="var(--success)" /> 70 Trades / Month</li>
                  <li className="feature-item"><Check size={18} color="var(--success)" /> Unlimited Verification Nodes</li>
                  <li className="feature-item"><Check size={18} color="var(--success)" /> Priority Support</li>
                  <li className="feature-item"><Check size={18} color="var(--success)" /> Custom Alpha Subnets</li>
                  <li className="feature-item"><Check size={18} color="var(--success)" /> Advanced Webhooks</li>
                </ul>
                <button 
                  className="subscribe-btn secondary"
                  onClick={() => handleSubscribe('whale')}
                >
                  {activePlanId === 'whale' ? 'Current Plan' : 'Join the Pod'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="copyright">&copy; 2026 Telegraph Sniper Bot</span>
          </div>
          <div className="footer-right">
            <span className="powered-by-footer">Built on the <strong>Telegraph Network</strong></span>
            <div className="footer-dots"></div>
            <span className="network-status">Network: Polygon Amoy</span>
          </div>
        </div>
      </footer>

      {/* Deposit via Kraken Modal */}
      {showDeposit && (
        <div className="modal-overlay glass" onClick={() => setShowDeposit(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content glass"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/logos/kraken-logo.png" alt="Kraken" style={{ height: '22px', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <h2 style={{ margin: 0 }}>Deposit Funds via Kraken</h2>
              </div>
              <button className="close-btn" onClick={() => setShowDeposit(false)}><X size={20} /></button>
            </div>
            <div className="modal-description">
              Funds will be pulled from your Kraken exchange account and deposited into your custodial sniper wallet on Polygon.
            </div>

            <div className="transfer-flow">
              <div className="wallet-node">
                <span className="node-label">Kraken Exchange</span>
                <span className="node-address">••••@kraken.com</span>
                <span className="node-balance">Available: 1,240.50 USDC</span>
              </div>
              <div className="flow-arrow"><ArrowRight size={24} color="var(--primary-color)" /></div>
              <div className="wallet-node highlight">
                <span className="node-label">Custodial Wallet</span>
                <span className="node-address">{custodialAddress ? `${custodialAddress.slice(0, 6)}...${custodialAddress.slice(-4)}` : 'Generating...'}</span>
              </div>
            </div>

            <div className="amount-input-group">
              <label>Amount to Deposit</label>
              <div className="input-wrap glass">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amounts.deposit}
                  onChange={(e) => setAmounts({ ...amounts, deposit: e.target.value })}
                />
                <button className="max-btn" onClick={() => setAmounts({ ...amounts, deposit: '500' })}>MAX</button>
                <span>USDC</span>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={13} color="var(--success)" />
              Gas fees covered by Kraken · Polygon network · ETA ~30s
            </div>

            <button className="primary-btn w-full mt-6" onClick={() => {
              setShowDeposit(false)
              setLoaderText({ title: 'Connecting to Kraken', sub: 'Authorising transfer on Polygon Network...' })
              setIsLoading(true)
              setTimeout(() => {
                setIsLoading(false)
                setSimUsdcBalance('500.00')
                setSimPolBalance('10.00')
                setSuccessMsg('Deposit Successful! +500 USDC · +10 POL')
                setShowSuccess(true)
                setTimeout(() => setShowSuccess(false), 3000)
              }, 2500)
            }}>
              Confirm Kraken Deposit
            </button>
          </motion.div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="modal-overlay glass" onClick={() => setShowWithdraw(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content glass"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Withdraw Funds</h2>
              <button className="close-btn" onClick={() => setShowWithdraw(false)}><X size={20} /></button>
            </div>
            <div className="modal-description">
              Move USDC from your custodial sniper wallet back to your personal wallet.
            </div>

            <div className="transfer-flow">
              <div className="wallet-node highlight">
                <span className="node-label">Custodial Wallet</span>
                <span className="node-address">{custodialAddress ? `${custodialAddress.slice(0, 6)}...${custodialAddress.slice(-4)}` : 'Generating...'}</span>
                <span className="node-balance">Max: {usdcBalance ? parseFloat(usdcBalance.formatted).toFixed(2) : '0.00'} USDC</span>
              </div>
              <div className="flow-arrow"><ArrowRight size={24} color="var(--secondary-color)" /></div>
              <div className="wallet-node">
                <span className="node-label">Connected Wallet</span>
                <span className="node-address">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
            </div>

            <div className="amount-input-group">
              <label>Amount to Withdraw</label>
              <div className="input-wrap glass">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amounts.withdraw}
                  onChange={(e) => setAmounts({ ...amounts, withdraw: e.target.value })}
                />
                <button className="max-btn">MAX</button>
                <span>USDC</span>
              </div>
            </div>

            <button className="primary-btn w-full mt-6" onClick={() => {
              setShowWithdraw(false)
              setLoaderText({ title: 'Processing Withdrawal', sub: 'Transacting from Custodial Vault...' })
              setIsLoading(true)
              setTimeout(() => {
                setIsLoading(false)
                setSuccessMsg('Withdrawal Successful!')
                setShowSuccess(true)
                setTimeout(() => setShowSuccess(false), 3000)
              }, 2000)
            }}>
              Confirm Withdrawal
            </button>
          </motion.div>
        </div>
      )}
      {/* Join/Create Wallet Modal */}
      {showJoinModal && (
        <div className="modal-overlay glass" onClick={() => setShowJoinModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content glass"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '540px' }}
          >
            <div className="modal-header">
              <div className="logo-group">
                <span className="logo-text" style={{ fontSize: '1rem' }}>SNIPER BOT</span>
                <span className="powered-by">Powered by Telegraph</span>
              </div>
              <button className="close-btn" onClick={() => setShowJoinModal(false)}><X size={20} /></button>
            </div>

            <div className="join-modal-body">
              <div className="setup-visual animate-glow">
                <Zap size={40} color="var(--primary-color)" fill="var(--primary-color)" />
              </div>

              <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Create Your Trading Account</h2>
              <p className="modal-description" style={{ textAlign: 'center' }}>
                To start trading on Polymarket with the **Telegraph Sniper Bot**, you need a dedicated custodial trading wallet. This wallet will execute positions on your behalf with ultra-low latency.
              </p>

              <div className="features-highlight">
                <div className="feature-row">
                  <CheckCircle2 size={18} color="var(--success)" />
                  <span>Secure Custodial Storage</span>
                </div>
                <div className="feature-row">
                  <CheckCircle2 size={18} color="var(--success)" />
                  <span>Integrated with Polygon Network</span>
                </div>
                <div className="feature-row">
                  <CheckCircle2 size={18} color="var(--success)" />
                  <span>Automated Trade Execution</span>
                </div>
              </div>

              <div className="agreement-notice">
                By creating a wallet, you agree to the automated trading terms and Telegraph Network protocols.
              </div>

              <button
                className="primary-btn w-full mt-6"
                onClick={handleCreateWallet}
                style={{ padding: '18px' }}
              >
                Generate My Trading Wallet
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Transaction / Global Loader */}
      {(isLoading || isAuthenticating) && (
        <div className="loader-overlay glass">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="loader-content-wrap"
          >
            <div className="premium-loader">
              <div className="loader-ring"></div>
              <div className="loader-ring inner"></div>
              <div className="loader-center">
                <Zap size={32} color="var(--primary-color)" fill="var(--primary-color)" className="animate-pulse" />
              </div>
            </div>
            <div className="loader-text-group">
              <h3 className="loader-title">{isAuthenticating ? 'Authenticating' : loaderText.title}</h3>
              <p className="loader-subtitle">{isAuthenticating ? 'Please sign the message in your wallet...' : loaderText.sub}</p>
            </div>
            <div className="loader-progress-bar">
              <motion.div
                className="loader-progress-fill"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.5, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="success-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="success-content glass"
          >
            <div className="success-icon-wrap">
              <CheckCircle2 size={60} color="var(--success)" />
            </div>
            <h2 className="success-title">{successMsg}</h2>
            <div className="success-pulse"></div>
          </motion.div>
        </div>
      )}

      {/* Error Animation Overlay */}
      {showError && (
        <div className="error-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="error-content glass"
          >
            <div className="error-icon-wrap">
              <AlertCircle size={60} color="var(--error)" />
            </div>
            <h2 className="error-title">{errorMsg}</h2>
            <div className="error-pulse"></div>
          </motion.div>
        </div>
      )}

      {/* Reason Tooltip */}
      {tooltip && (
        <div
          className="dt-reason-tooltip-fixed"
          style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay glass" onClick={() => setShowProfileModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0, x: 20 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            className="modal-content glass profile-modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '420px', position: 'absolute', right: '40px', top: '80px' }}
          >
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <User size={20} color="var(--primary-color)" />
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Account Profile</h2>
              </div>
              <button className="close-btn" onClick={() => setShowProfileModal(false)}><X size={20} /></button>
            </div>

            <div className="profile-modal-body">
              <div className="profile-section-block">
                <div className="section-label-mini">CONNECTED WALLET</div>
                <div className="address-display-box glass">
                  <div className="address-text-main">
                    {isConnected ? `${address?.slice(0, 12)}...${address?.slice(-8)}` : 'Not Connected'}
                  </div>
                  {isConnected && (
                    <button className="copy-icon-btn" onClick={() => copyToClipboard(address || '')}>
                      <Copy size={14} />
                    </button>
                  )}
                </div>
                <div className="network-status-badge">
                  <div className={`status-dot ${isConnected ? 'active' : ''}`}></div>
                  <span>{isConnected ? 'Mainnet Connected' : 'Connection Required'}</span>
                </div>
              </div>

              <div className="profile-section-block mt-6">
                <div className="section-label-mini">CUSTODIAL TRADING WALLET</div>
                {hasWallet ? (
                  <>
                    <div className="address-display-box glass active">
                      <div className="address-text-main">
                        {custodialAddress ? `${custodialAddress.slice(0, 12)}...${custodialAddress.slice(-8)}` : '0x821c...E492'}
                      </div>
                      <button className="copy-icon-btn" onClick={() => copyToClipboard(custodialAddress || '0x821c21C378657B69C4E0f4388B12dD8b3947E492')}>
                        <Copy size={14} />
                      </button>
                    </div>
                    <div className="account-meta-grid mt-3">
                      <div className="meta-item">
                        <span className="meta-label">NETWORK</span>
                        <span className="meta-value">Polygon</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">PROTOCOL</span>
                        <span className="meta-value">Telegraph V3</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state-card glass">
                    <p>No trading wallet configured yet.</p>
                    <button className="link-btn" onClick={() => { setShowProfileModal(false); setShowJoinModal(true); }}>
                      Setup Now
                    </button>
                  </div>
                )}
              </div>

              <div className="profile-modal-footer mt-8">
                <div className="powered-tag-large">
                  <Zap size={16} fill="var(--primary-color)" color="var(--primary-color)" />
                  <span>Powered by <strong>Telegraph Network</strong></span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default App
