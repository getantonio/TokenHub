import { render, screen, fireEvent } from '@testing-library/react';
import { WalletConnect } from '@/components/wallet-connect';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useConnect: jest.fn(),
  useDisconnect: jest.fn(),
  injected: jest.fn()
}));

describe('WalletConnect', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows connect button when not connected', () => {
    // Mock the hooks for disconnected state
    (useAccount as jest.Mock).mockReturnValue({
      address: undefined,
      isConnected: false
    });
    
    (useConnect as jest.Mock).mockReturnValue({
      connect: jest.fn()
    });

    render(<WalletConnect />);
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('shows address and disconnect button when connected', () => {
    const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';
    
    // Mock the hooks for connected state
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true
    });
    
    (useDisconnect as jest.Mock).mockReturnValue({
      disconnect: jest.fn()
    });

    render(<WalletConnect />);
    
    // Check if address is displayed correctly
    expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('calls connect function when connect button is clicked', () => {
    const mockConnect = jest.fn();
    
    (useAccount as jest.Mock).mockReturnValue({
      address: undefined,
      isConnected: false
    });
    
    (useConnect as jest.Mock).mockReturnValue({
      connect: mockConnect
    });

    render(<WalletConnect />);
    
    fireEvent.click(screen.getByText('Connect Wallet'));
    expect(mockConnect).toHaveBeenCalled();
  });

  it('calls disconnect function when disconnect button is clicked', () => {
    const mockDisconnect = jest.fn();
    const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';
    
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true
    });
    
    (useDisconnect as jest.Mock).mockReturnValue({
      disconnect: mockDisconnect
    });

    render(<WalletConnect />);
    
    fireEvent.click(screen.getByText('Disconnect'));
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('handles mounting state correctly', () => {
    // Mock the hooks
    (useAccount as jest.Mock).mockReturnValue({
      address: undefined,
      isConnected: false
    });
    
    (useConnect as jest.Mock).mockReturnValue({
      connect: jest.fn()
    });

    render(<WalletConnect />);
    
    // Initial state should show connect button
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });
}); 