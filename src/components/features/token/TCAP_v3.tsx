import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import TokenFactory_v3 from '@contracts/abi/TokenFactory_v3.0.0.json';
import TokenTemplate_v3 from '@contracts/abi/TokenTemplate_v3.0.0.json';
import TokenGovernor_v3 from '@contracts/abi/TokenGovernor_v3.0.0.json';
import Treasury_v3 from '@contracts/abi/Treasury_v3.0.0.json';
import { getExplorerUrl } from '@config/networks';
import { useNetwork } from '@contexts/NetworkContext';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@components/ui/Spinner';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';

interface TokenAdminProps {
  isConnected: boolean;
  address?: string;
  provider: BrowserProvider | null;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  daoAddress: string;
  timelockAddress: string;
  treasuryAddress: string;
  votingDelay: number;
  votingPeriod: number;
  proposalThreshold: string;
  quorumNumerator: number;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
  link?: string;
}

interface ProposalInfo {
  id: string;
  description: string;
  proposer: string;
  state: string;
  startBlock: number;
  endBlock: number;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
}

export default function TokenAdmin({ isConnected, address, provider: externalProvider }: TokenAdminProps) {
  const { chainId } = useNetwork();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalInfo[]>([]);
  const [proposalDescription, setProposalDescription] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hiddenTokens, setHiddenTokens] = useState<string[]>([]);

  useEffect(() => {
    if (isConnected && chainId && externalProvider && address) {
      console.log("Dependencies changed, reloading tokens:", {
        isConnected,
        chainId,
        hasProvider: !!externalProvider,
        address
      });
      loadTokens();
    }
  }, [isConnected, chainId, externalProvider, address]);

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    toast({
      variant: type === 'error' ? 'destructive' : 'default',
      title: type === 'error' ? 'Error' : 'Success',
      description: (
        <div>
          {message}
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 ml-2">
              View Transaction
            </a>
          )}
        </div>
      ),
    });
  };

  const loadTokens = async () => {
    if (!isConnected || !chainId || !externalProvider || !address) {
      console.log("Cannot load tokens - missing requirements");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Starting token loading process...");
      
      const signer = await externalProvider.getSigner();
      const factory = new Contract(address, TokenFactory_v3.abi, signer);
      
      // Get deployed tokens
      const deployedTokens = await factory.getTokensByUser(await signer.getAddress());
      console.log("Found tokens:", deployedTokens);
      
      if (deployedTokens && deployedTokens.length > 0) {
        const tokenPromises = deployedTokens.map(async (tokenAddr: string) => {
          try {
            const token = new Contract(tokenAddr, TokenTemplate_v3.abi, externalProvider);
            const [name, symbol, totalSupply] = await Promise.all([
              token.name(),
              token.symbol(),
              token.totalSupply()
            ]);

            // Get associated contracts
            const daoAddress = await factory.tokenToDAO(tokenAddr);
            const timelockAddress = await factory.tokenToTimelock(tokenAddr);
            const treasuryAddress = await factory.tokenToTreasury(tokenAddr);

            // Get governance settings
            const governor = new Contract(daoAddress, TokenGovernor_v3.abi, externalProvider);
            const [votingDelay, votingPeriod, proposalThreshold, quorumNumerator] = await Promise.all([
              governor.votingDelay(),
              governor.votingPeriod(),
              governor.proposalThreshold(),
              governor.quorumNumerator()
            ]);

            return {
              address: tokenAddr,
              name,
              symbol,
              totalSupply: formatUnits(totalSupply, 18),
              daoAddress,
              timelockAddress,
              treasuryAddress,
              votingDelay: Number(votingDelay),
              votingPeriod: Number(votingPeriod),
              proposalThreshold: formatUnits(proposalThreshold, 18),
              quorumNumerator: Number(quorumNumerator)
            };
          } catch (error) {
            console.error(`Error checking token ${tokenAddr}:`, error);
            return null;
          }
        });

        const tokenResults = await Promise.all(tokenPromises);
        const validTokens = tokenResults.filter(Boolean);
        if (validTokens.length > 0) {
          setTokens(validTokens as TokenInfo[]);
        }
      }
    } catch (error: any) {
      console.error('Error loading tokens:', error);
      showToast('error', error.message || 'Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProposals = async (tokenInfo: TokenInfo) => {
    if (!externalProvider) return;

    try {
      setIsLoading(true);
      const governor = new Contract(tokenInfo.daoAddress, TokenGovernor_v3.abi, externalProvider);
      
      // Get proposal count (implementation specific)
      const filter = governor.filters.ProposalCreated();
      const events = await governor.queryFilter(filter);
      
      const proposalPromises = events.map(async (event: any) => {
        const proposalId = event.args[0];
        const [state, proposal] = await Promise.all([
          governor.state(proposalId),
          governor.proposals(proposalId)
        ]);

        return {
          id: proposalId.toString(),
          description: event.args[event.args.length - 1],
          proposer: proposal.proposer,
          state: getProposalState(state),
          startBlock: Number(proposal.startBlock),
          endBlock: Number(proposal.endBlock),
          forVotes: formatUnits(proposal.forVotes, 18),
          againstVotes: formatUnits(proposal.againstVotes, 18),
          abstainVotes: formatUnits(proposal.abstainVotes, 18)
        };
      });

      const proposalResults = await Promise.all(proposalPromises);
      setProposals(proposalResults);
    } catch (error: any) {
      console.error('Error loading proposals:', error);
      showToast('error', error.message || 'Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  };

  const createProposal = async (tokenInfo: TokenInfo) => {
    if (!externalProvider) return;

    try {
      setIsLoading(true);
      const signer = await externalProvider.getSigner();
      const governor = new Contract(tokenInfo.daoAddress, TokenGovernor_v3.abi, signer);

      // Example proposal to transfer tokens from treasury
      const treasury = new Contract(tokenInfo.treasuryAddress, Treasury_v3.abi, signer);
      const transferCalldata = treasury.interface.encodeFunctionData('sendTokens', [
        tokenInfo.address,
        await signer.getAddress(),
        parseUnits('1000', 18)
      ]);

      const tx = await governor.propose(
        [tokenInfo.treasuryAddress],
        [0],
        [transferCalldata],
        proposalDescription
      );

      showToast('success', 'Proposal submitted...');
      
      await tx.wait();
      showToast('success', 'Proposal created successfully!');
      
      await loadProposals(tokenInfo);
      setProposalDescription('');
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      showToast('error', error.message || 'Failed to create proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const castVote = async (tokenInfo: TokenInfo, proposalId: string, support: number) => {
    if (!externalProvider) return;

    try {
      setIsLoading(true);
      const signer = await externalProvider.getSigner();
      const governor = new Contract(tokenInfo.daoAddress, TokenGovernor_v3.abi, signer);

      const tx = await governor.castVote(proposalId, support);
      showToast('success', 'Vote submitted...');
      
      await tx.wait();
      showToast('success', 'Vote cast successfully!');
      
      await loadProposals(tokenInfo);
    } catch (error: any) {
      console.error('Error casting vote:', error);
      showToast('error', error.message || 'Failed to cast vote');
    } finally {
      setIsLoading(false);
    }
  };

  const executeProposal = async (tokenInfo: TokenInfo, proposalId: string) => {
    if (!externalProvider) return;

    try {
      setIsLoading(true);
      const signer = await externalProvider.getSigner();
      const governor = new Contract(tokenInfo.daoAddress, TokenGovernor_v3.abi, signer);

      // Get proposal details
      const proposalData = await governor.getProposalData(proposalId);

      const tx = await governor.execute(
        proposalData.targets,
        proposalData.values,
        proposalData.calldatas,
        proposalData.descriptionHash
      );

      showToast('success', 'Execution submitted...');
      
      await tx.wait();
      showToast('success', 'Proposal executed successfully!');
      
      await loadProposals(tokenInfo);
    } catch (error: any) {
      console.error('Error executing proposal:', error);
      showToast('error', error.message || 'Failed to execute proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const getProposalState = (state: number): string => {
    const states = [
      'Pending',
      'Active',
      'Canceled',
      'Defeated',
      'Succeeded',
      'Queued',
      'Expired',
      'Executed'
    ];
    return states[state] || 'Unknown';
  };

  function hideToken(address: string) {
    setHiddenTokens(prev => [...prev, address]);
  }

  function resetHiddenTokens() {
    setHiddenTokens([]);
  }

  function getVisibleTokens() {
    const visible = tokens.filter(token => !hiddenTokens.includes(token.address));
    console.log(`Showing ${visible.length}/${tokens.length} tokens (${hiddenTokens.length} hidden)`);
    return visible;
  }

  if (!isConnected) {
    return (
      <div className="p-2 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xs font-medium text-text-primary">Token Management (V3)</h2>
        <p className="text-xs text-text-secondary">Please connect your wallet to manage tokens.</p>
      </div>
    );
  }

  return (
    <div className="p-2 relative bg-gray-800 rounded-lg shadow-lg">
      <div
        className="flex justify-between items-center cursor-pointer py-0.5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xs font-medium text-text-primary">TCAP_v3</h2>
        <div className="flex items-center gap-2">
          {hiddenTokens.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetHiddenTokens();
              }}
              className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            >
              Show All ({hiddenTokens.length})
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadTokens();
            }}
            className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          >
            Refresh
          </button>
          <button className="text-text-accent hover:text-blue-400">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        isLoading ? (
          <div className="flex justify-center items-center py-1">
            <Spinner className="w-4 h-4 text-text-primary" />
          </div>
        ) : getVisibleTokens().length === 0 ? (
          <div className="mt-0.5">
            <p className="text-xs text-text-secondary">No V3 tokens found. Deploy a new token to get started.</p>
          </div>
        ) : (
          <div className="space-y-2 mt-1">
            {getVisibleTokens().map(token => (
              <div key={token.address} className="border border-border rounded-lg p-2 space-y-2 bg-background-secondary">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">{token.name} ({token.symbol})</h3>
                    <p className="text-xs text-text-secondary">Token: {token.address}</p>
                    <p className="text-xs text-text-secondary">Total Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedToken(selectedToken === token.address ? null : token.address);
                        if (selectedToken !== token.address) {
                          loadProposals(token);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                    >
                      {selectedToken === token.address ? 'Hide' : 'Manage'}
                    </button>
                    <button
                      onClick={() => hideToken(token.address)}
                      className="text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-400 hover:bg-gray-500/20"
                      title="Hide token"
                    >
                      Hide
                    </button>
                  </div>
                </div>

                {selectedToken === token.address && (
                  <div className="space-y-4 pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-text-primary mb-1">Governance Info</h4>
                        <p className="text-xs text-text-secondary">DAO: {token.daoAddress}</p>
                        <p className="text-xs text-text-secondary">Treasury: {token.treasuryAddress}</p>
                        <p className="text-xs text-text-secondary">Timelock: {token.timelockAddress}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-text-primary mb-1">Voting Parameters</h4>
                        <p className="text-xs text-text-secondary">Voting Delay: {token.votingDelay} blocks</p>
                        <p className="text-xs text-text-secondary">Voting Period: {token.votingPeriod} blocks</p>
                        <p className="text-xs text-text-secondary">Proposal Threshold: {token.proposalThreshold} {token.symbol}</p>
                        <p className="text-xs text-text-secondary">Quorum: {token.quorumNumerator}%</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-text-primary">Create Proposal</h4>
                      <div className="flex gap-2">
                        <Input
                          value={proposalDescription}
                          onChange={(e) => setProposalDescription(e.target.value)}
                          placeholder="Proposal description"
                          className="text-xs"
                        />
                        <Button
                          onClick={() => createProposal(token)}
                          className="text-xs px-3"
                          disabled={!proposalDescription}
                        >
                          Create
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-text-primary">Active Proposals</h4>
                      {proposals.length === 0 ? (
                        <p className="text-xs text-text-secondary">No proposals found.</p>
                      ) : (
                        <div className="space-y-2">
                          {proposals.map(proposal => (
                            <div key={proposal.id} className="p-2 bg-gray-700/50 rounded-lg space-y-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs text-text-primary font-medium">
                                    Proposal #{proposal.id}
                                  </p>
                                  <p className="text-xs text-text-secondary">
                                    {proposal.description}
                                  </p>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                  {proposal.state}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 text-xs text-text-secondary">
                                <div>For: {proposal.forVotes}</div>
                                <div>Against: {proposal.againstVotes}</div>
                                <div>Abstain: {proposal.abstainVotes}</div>
                              </div>

                              <div className="flex gap-2">
                                {proposal.state === 'Active' && (
                                  <>
                                    <Button
                                      onClick={() => castVote(token, proposal.id, 1)}
                                      className="text-xs px-2 py-1"
                                    >
                                      Vote For
                                    </Button>
                                    <Button
                                      onClick={() => castVote(token, proposal.id, 0)}
                                      className="text-xs px-2 py-1"
                                    >
                                      Vote Against
                                    </Button>
                                    <Button
                                      onClick={() => castVote(token, proposal.id, 2)}
                                      className="text-xs px-2 py-1"
                                    >
                                      Abstain
                                    </Button>
                                  </>
                                )}
                                {proposal.state === 'Succeeded' && (
                                  <Button
                                    onClick={() => executeProposal(token, proposal.id)}
                                    className="text-xs px-2 py-1"
                                  >
                                    Execute
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <a
                        href={getExplorerUrl(chainId || 0, token.address, 'token')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-accent hover:text-blue-400"
                      >
                        View Token ↗
                      </a>
                      <span className="text-text-secondary">•</span>
                      <a
                        href={getExplorerUrl(chainId || 0, token.daoAddress, 'address')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-accent hover:text-blue-400"
                      >
                        View DAO ↗
                      </a>
                      <span className="text-text-secondary">•</span>
                      <a
                        href={getExplorerUrl(chainId || 0, token.treasuryAddress, 'address')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-accent hover:text-blue-400"
                      >
                        View Treasury ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
} 