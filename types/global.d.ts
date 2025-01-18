import { provider } from 'web3-core';
import { JsonRpcPayload, JsonRpcResponse } from 'web3-core-helpers';

interface EthereumProvider extends provider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  enable: () => Promise<string[]>;
  on: (event: string, callback: (params?: any) => void) => void;
  removeListener: (event: string, callback: (params?: any) => void) => void;
  selectedAddress: string | null;
  chainId: string;
  networkVersion: string;
  // Add WebsocketProvider required properties
  isConnecting: boolean;
  connected: boolean;
  disconnect: () => void;
  reconnect: () => void;
  requestQueue: Map<string, any>;
  responseQueue: Map<string, any>;
  once: (type: string, handler: (payload: JsonRpcPayload) => void) => void;
  removeAllListeners: (type: string) => void;
  send: (payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => void) => void;
  sendAsync: (payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => void) => void;
}

interface Window {
  ethereum?: any;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {}; 