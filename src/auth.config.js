import { signInWithCustomToken } from 'firebase/auth';
import { ethers } from 'ethers';

const authConfig = {
  signInOptions: [
    {
      provider: 'google.com',
      customParameters: {
        prompt: 'select_account'
      }
    },
    {
      provider: 'password',
      requireDisplayName: true
    }
  ],
  signInFlow: 'popup',
  callbacks: {
    signInSuccessWithAuthResult: () => false
  }
};

// MetaMask Authentication Helper
const metamaskAuth = {
  // Connect to MetaMask
  async connect() {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      const address = accounts[0];
      
      // Get the signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Create message for signing
      const message = `Welcome to TokenFactory!\n\nClick to sign in and accept the Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet address:\n${address}`;
      
      // Sign the message
      const signature = await signer.signMessage(message);
      
      // Here you would typically:
      // 1. Send the address and signature to your backend
      // 2. Backend verifies the signature
      // 3. Backend generates a Firebase custom token
      // 4. Return the token to the client
      
      return { address, signature };
    } catch (error) {
      throw new Error('Failed to connect to MetaMask: ' + error.message);
    }
  },

  // Sign in with the custom token from your backend
  async signIn(customToken) {
    try {
      const auth = getAuth();
      await signInWithCustomToken(auth, customToken);
    } catch (error) {
      throw new Error('Failed to sign in with custom token: ' + error.message);
    }
  }
};

export { authConfig, metamaskAuth }; 