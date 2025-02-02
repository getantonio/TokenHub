import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { metamaskAuth } from '../auth.config';

export function useMetaMaskAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signInWithMetaMask = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Connect to MetaMask and get signature
      const { address, signature } = await metamaskAuth.connect();

      // Call Firebase function to verify signature and get custom token
      const functions = getFunctions();
      const authenticateMetaMask = httpsCallable(functions, 'authenticateMetaMask');
      const result = await authenticateMetaMask({ address, signature });

      // Sign in with the custom token
      await metamaskAuth.signIn(result.data.token);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    signInWithMetaMask,
    loading,
    error
  };
} 