import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage, useChainId, useSwitchChain, useDisconnect } from 'wagmi';
import api from '../utils/api';
import { subscriptionConfig } from '../utils/subscription';

const SUBSCRIPTION_CHAIN_ID = subscriptionConfig.chainId;

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [user, setUser] = useState<any>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const checkStatus = useCallback(async () => {
    const token = localStorage.getItem('telegraph_token');
    if (!token) return false;

    try {
      const { data } = await api.get('/auth/status');
      setUser(data.user);
      setIsLoggedIn(true);
      return true;
    } catch (e) {
      localStorage.removeItem('telegraph_token');
      setIsLoggedIn(false);
      setUser(null);
      return false;
    }
  }, []);

  const login = useCallback(async () => {
    if (!address || !isConnected) return;

    try {
      setIsAuthenticating(true);

      // 1. Ensure correct network
      if (chainId !== SUBSCRIPTION_CHAIN_ID) {
        try {
          await switchChainAsync({ chainId: SUBSCRIPTION_CHAIN_ID });
          // Network switch will trigger a re-render and checkStatus/login loop handled by useEffect
          return;
        } catch (e) {
          console.error('Failed to switch network', e);
          return;
        }
      }

      // 2. Get login message
      const { data: { message } } = await api.get('/auth/message');

      // 3. Sign message
      const signature = await signMessageAsync({ message, account: address as `0x${string}` });

      // 4. Verify and get JWT
      const { data: { token, user: userData } } = await api.post('/auth/verify', { address, signature });

      localStorage.setItem('telegraph_token', token);
      setUser(userData);
      setIsLoggedIn(true);

    } catch (error) {
      console.error('Authentication failed:', error);
      disconnect();
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, isConnected, chainId, switchChainAsync, signMessageAsync, disconnect]);

  const logout = useCallback(() => {
    localStorage.removeItem('telegraph_token');
    setIsLoggedIn(false);
    setUser(null);
    disconnect();
  }, [disconnect]);

  // Handle initialization and connection changes
  useEffect(() => {
    const init = async () => {
      if (isConnected && address) {
        const isValid = await checkStatus();
        if (!isValid) {
          await login();
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    };

    init();
  }, [isConnected, address, checkStatus, login]);

  // Listen for global auth required events (e.g. from 401 interceptor)
  useEffect(() => {
    const handleAuthRequired = () => {
      setIsLoggedIn(false);
      setUser(null);
      if (isConnected && address) {
        login();
      }
    };

    window.addEventListener('auth_required', handleAuthRequired);
    return () => window.removeEventListener('auth_required', handleAuthRequired);
  }, [isConnected, address, login]);

  return {
    isLoggedIn,
    isAuthenticating,
    user,
    login,
    logout,
    checkStatus
  };
};
