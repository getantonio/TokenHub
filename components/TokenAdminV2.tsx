import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactory_v2 from '../contracts/abi/TokenFactory_v2.json';
import { getContractAddress } from '../config/networks';
import type { MetaMaskInpageProvider } from "@metamask/providers";

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

interface TokenAdminV2Props {
  isConnected: boolean;
}

interface PresaleToken {
  address: string;
  name: string;
  symbol: string;
  softCap: string;
  hardCap: string;
  presaleRate: string;
  startTime: number;
  endTime: number;
  totalContributed: string;
  isWhitelistEnabled: boolean;
  status: 'pending' | 'active' | 'ended';
}

export function TokenAdminV2({ isConnected }: TokenAdminV2Props) {
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<PresaleToken[]>([]);
  const [currentAddress, setCurrentAddress] = useState('');

  useEffect(() => {
    if (isConnected && chainId) {
      loadTokens();
    }
  }, [isConnected, chainId]);

  useEffect(() => {
    if (isConnected) {
      getCurrentAddress();
    }
  }, [isConnected]);

  async function getCurrentAddress() {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setCurrentAddress(address);
    } catch (error) {
      console.error('Error getting current address:', error);
    }
  }

  async function loadTokens() {
    if (!chainId) return;

    try {
      setLoading(true);
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const factoryAddress = getContractAddress(chainId, 'TokenFactory_v2');
      
      if (!factoryAddress) {
        console.error('Factory not deployed on this network');
        return;
      }

      const factory = new ethers.Contract(factoryAddress, TokenFactory_v2.abi, signer);
      const tokenAddresses = await factory.getDeployedTokens();
      
      const tokenPromises = tokenAddresses.map(async (address: string) => {
        const token = await factory.getTokenInfo(address);
        return {
          address,
          name: token.name,
          symbol: token.symbol,
          softCap: ethers.formatEther(token.softCap),
          hardCap: ethers.formatEther(token.hardCap),
          presaleRate: token.presaleRate.toString(),
          startTime: Number(token.startTime),
          endTime: Number(token.endTime),
          totalContributed: ethers.formatEther(token.totalContributed),
          isWhitelistEnabled: token.isWhitelistEnabled,
          status: getPresaleStatus(Number(token.startTime), Number(token.endTime))
        };
      });

      const loadedTokens = await Promise.all(tokenPromises);
      setTokens(loadedTokens);
    } catch (error) {
      console.error('Error loading tokens:', error);
    } finally {
      setLoading(false);
    }
  }

  function getPresaleStatus(startTime: number, endTime: number): 'pending' | 'active' | 'ended' {
    const now = Math.floor(Date.now() / 1000);
    if (now < startTime) return 'pending';
    if (now > endTime) return 'ended';
    return 'active';
  }

  if (!isConnected) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-text-primary mb-4">Your Presale Tokens</h2>
      {loading ? (
        <div className="text-text-secondary">Loading tokens...</div>
      ) : tokens.length === 0 ? (
        <div className="text-text-secondary">No tokens found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tokens.map((token) => (
            <div key={token.address} className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{token.name} ({token.symbol})</h3>
                  <p className="text-sm text-text-secondary">{token.address}</p>
                </div>
                <span className={`status-badge status-${token.status}`}>
                  {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Soft Cap:</span>
                  <span className="text-text-primary">{token.softCap} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Hard Cap:</span>
                  <span className="text-text-primary">{token.hardCap} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Contributed:</span>
                  <span className="text-text-primary">{token.totalContributed} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Presale Rate:</span>
                  <span className="text-text-primary">{token.presaleRate} tokens/ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Start Time:</span>
                  <span className="text-text-primary">{new Date(token.startTime * 1000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">End Time:</span>
                  <span className="text-text-primary">{new Date(token.endTime * 1000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Whitelist:</span>
                  <span className="text-text-primary">{token.isWhitelistEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 