import '@testing-library/jest-dom';
import 'jest-environment-jsdom';

// Create mock functions
const createMockFn = () => {
  let resolvedValue: any = undefined;
  const fn = () => {
    return resolvedValue !== undefined ? Promise.resolve(resolvedValue) : undefined;
  };
  fn.mockResolvedValue = (val: any) => {
    resolvedValue = val;
    return fn;
  };
  return fn;
};

// Mock window.ethereum
const ethereum = {
  isMetaMask: true,
  request: createMockFn(),
  on: createMockFn(),
  removeListener: createMockFn(),
  enable: (() => Promise.resolve(['0x123'])),
  sendAsync: createMockFn(),
  selectedAddress: null,
  networkVersion: '1',
  isConnected: () => true,
  connected: true,
  disconnect: createMockFn(),
  reconnect: createMockFn(),
  supportsSubscriptions: () => false,
  send: (payload: any, callback: any) => {
    callback(null, { jsonrpc: '2.0', id: payload.id, result: [] });
  }
};

Object.defineProperty(window, 'ethereum', {
  value: ethereum,
  writable: true
});

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver;