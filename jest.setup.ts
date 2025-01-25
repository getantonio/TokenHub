import '@testing-library/jest-dom';
import 'jest-environment-jsdom';

// Mock window.ethereum
const ethereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  isMetaMask: true
};

Object.defineProperty(window, 'ethereum', {
  value: ethereum,
  writable: true
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));