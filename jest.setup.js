import '@testing-library/jest-dom'

// Mock window.ethereum
const ethereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
}
Object.defineProperty(window, 'ethereum', {
  value: ethereum,
})