import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactory_v2 from '../contracts/abi/TokenFactory_v2.json';
import TokenTemplate_v2 from '../contracts/abi/TokenTemplate_v2.json';
import { getNetworkContractAddress } from '../config/contracts';
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
      const userAddress = await signer.getAddress();
      console.log("Looking for tokens deployed by:", userAddress);
      
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2');
      console.log("V2 Factory address:", factoryAddress);
      
      if (!factoryAddress) {
        throw new Error('V2 Factory not deployed on this network');
      }

      // Verify contract exists
      const code = await provider.getCode(factoryAddress);
      if (code === '0x') {
        console.error('No contract found at factory address');
        return;
      }

      const factory = new ethers.Contract(factoryAddress, TokenFactory_v2.abi, signer);
      
      // Get factory version
      const version = await factory.VERSION();
      console.log("Factory version:", version);

      // Get deployed tokens
      const tokenAddresses = await factory.getDeployedTokens(userAddress);
      console.log("Found tokens:", tokenAddresses);
      
      const tokenPromises = tokenAddresses.map(async (address: string) => {
        try {
          const token = new ethers.Contract(address, TokenTemplate_v2.abi, signer);
          const [name, symbol, softCap, hardCap, presaleRate, startTime, endTime, totalContributed, isWhitelistEnabled] = await Promise.all([
            token.name(),
            token.symbol(),
            token.softCap(),
            token.hardCap(),
            token.presaleRate(),
            token.startTime(),
            token.endTime(),
            token.totalContributed(),
            token.isWhitelistEnabled()
          ]);

          return {
            address,
            name,
            symbol,
            softCap: ethers.formatEther(softCap),
            hardCap: ethers.formatEther(hardCap),
            presaleRate: presaleRate.toString(),
            startTime: Number(startTime),
            endTime: Number(endTime),
            totalContributed: ethers.formatEther(totalContributed),
            isWhitelistEnabled,
            status: getPresaleStatus(Number(startTime), Number(endTime))
          };
        } catch (error) {
          console.error('Error loading token info for', address, error);
          return null;
        }
      });

      const loadedTokens = (await Promise.all(tokenPromises)).filter(Boolean);
      setTokens(loadedTokens as PresaleToken[]);
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