import { render, screen } from '@testing-library/react'
import CryptoHub from '@/components/crypto-hub'

// Mock web3 functionality
jest.mock('web3', () => {
  return jest.fn().mockImplementation(() => ({
    eth: {
      getAccounts: jest.fn().mockResolvedValue(['0x123']),
      Contract: jest.fn()
    }
  }));
});

// Mock window.ethereum
const mockEthereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  isMetaMask: true
};

beforeEach(() => {
  global.window.ethereum = mockEthereum;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('CryptoHub', () => {
  it('renders without crashing', () => {
    render(<CryptoHub />)
    expect(screen.getByText(/TokenHub/i)).toBeInTheDocument()
  })

  it('shows connect wallet button when not connected', () => {
    render(<CryptoHub />)
    expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument()
  })
}) 