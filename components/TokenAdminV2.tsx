import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactory_v2 from '../contracts/abi/TokenFactory_v2.json';
import TokenTemplate_v2 from '../contracts/abi/TokenTemplate_v2.json';
import { getNetworkContractAddress } from '../config/contracts';
import type { MetaMaskInpageProvider } from "@metamask/providers";
import { Contract } from 'ethers';
import { formatUnits } from 'ethers';

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
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

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

  useEffect(() => {
    if (isConnected && window.ethereum) {
      setProvider(new ethers.BrowserProvider(window.ethereum as any));
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

  const loadTokens = async () => {
    if (!isConnected || !window.ethereum || !chainId || !provider) {
      console.error("Missing dependencies:", {
        isConnected,
        hasEthereum: !!window.ethereum,
        chainId,
        hasProvider: !!provider
      });
      return;
    }

    try {
      setIsLoading(true);
      const signer = await provider.getSigner();
      const userAddress = currentAddress || await signer.getAddress();
      
      // Check V2 Factory
      const factoryV2Address = getNetworkContractAddress(chainId, 'factoryAddressV2');
      if (!factoryV2Address) {
        console.error('No V2 factory deployed on this network');
        return;
      }

      // Verify contract exists
      const code = await provider.getCode(factoryV2Address);
      if (code === '0x') {
        console.error('No contract found at factory address');
        return;
      }

      const factoryV2 = new Contract(factoryV2Address, TokenFactory_v2.abi, provider);
      const factoryWithSigner = factoryV2.connect(signer) as Contract;

      // Get all deployed tokens
      try {
        // Try with increased gas limit
        const deployedTokens = await factoryWithSigner.getDeployedTokens(userAddress, {
          gasLimit: 500000
        });

        const tokenPromises = deployedTokens.map(async (tokenAddress: string) => {
          try {
            // Verify token contract exists
            const tokenCode = await provider.getCode(tokenAddress);
            if (tokenCode === '0x') {
              console.error(`No contract found at token address: ${tokenAddress}`);
              return null;
            }

            const token = new Contract(tokenAddress, TokenTemplate_v2.abi, signer);
            const [
              name,
              symbol,
              softCap,
              hardCap,
              presaleRate,
              startTime,
              endTime,
              totalContributed,
              isWhitelistEnabled
            ] = await Promise.all([
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
              address: tokenAddress,
              name,
              symbol,
              softCap: formatUnits(softCap, 18),
              hardCap: formatUnits(hardCap, 18),
              presaleRate: presaleRate.toString(),
              startTime: Number(startTime),
              endTime: Number(endTime),
              totalContributed: formatUnits(totalContributed, 18),
              isWhitelistEnabled,
              status: getPresaleStatus(Number(startTime), Number(endTime))
            };
          } catch (error) {
            console.error(`Error loading token info for ${tokenAddress}:`, error);
            return null;
          }
        });

        const loadedTokens = (await Promise.all(tokenPromises)).filter(Boolean) as PresaleToken[];
        setTokens(loadedTokens);
      } catch (error: any) {
        console.error('Error loading V2 tokens:', {
          error,
          errorName: error.name,
          errorCode: error.code,
          errorMessage: error.message,
          errorData: error.data,
          transaction: error.transaction
        });

        // Fallback to events
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 1000);

        const filter = {
          address: factoryV2Address,
          fromBlock,
          toBlock: currentBlock,
          topics: [
            ethers.id("TokenCreated(address,string,string,address,uint256,uint256,bool,bool)")
          ]
        };

        const logs = await provider.getLogs(filter);
        const foundTokens = new Set<string>();

        for (const log of logs) {
          try {
            const parsedLog = factoryV2.interface.parseLog(log);
            if (parsedLog && parsedLog.args) {
              const creator = parsedLog.args[0];
              const tokenAddr = parsedLog.args[3];

              if (creator.toLowerCase() === userAddress.toLowerCase()) {
                foundTokens.add(tokenAddr);
              }
            }
          } catch (error) {
            console.error("Error parsing log:", error);
          }
        }

        // Load token info for found tokens
        const tokenPromises = Array.from(foundTokens).map(async (tokenAddress) => {
          try {
            const token = new Contract(tokenAddress, TokenTemplate_v2.abi, signer);
            const [
              name,
              symbol,
              softCap,
              hardCap,
              presaleRate,
              startTime,
              endTime,
              totalContributed,
              isWhitelistEnabled
            ] = await Promise.all([
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
              address: tokenAddress,
              name,
              symbol,
              softCap: formatUnits(softCap, 18),
              hardCap: formatUnits(hardCap, 18),
              presaleRate: presaleRate.toString(),
              startTime: Number(startTime),
              endTime: Number(endTime),
              totalContributed: formatUnits(totalContributed, 18),
              isWhitelistEnabled,
              status: getPresaleStatus(Number(startTime), Number(endTime))
            };
          } catch (error) {
            console.error(`Error loading token info for ${tokenAddress}:`, error);
            return null;
          }
        });

        const loadedTokens = (await Promise.all(tokenPromises)).filter(Boolean) as PresaleToken[];
        setTokens(loadedTokens);
      }
    } catch (error: any) {
      console.error('Error loading tokens:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      {isLoading ? (
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