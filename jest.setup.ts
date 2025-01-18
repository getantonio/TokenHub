import '@testing-library/jest-dom';

// Mock window.ethereum
const ethereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  isMetaMask: true,
};

Object.defineProperty(window, 'ethereum', {
  value: ethereum,
  writable: true,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver;