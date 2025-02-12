import React, { useState } from 'react';
import { Mailchain } from '@mailchain/sdk';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { useAccount, useSignMessage } from 'wagmi';

interface EmailValidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onValidated: (email: string) => void;
}

const FACTORY_OWNER_ADDRESS = process.env.NEXT_PUBLIC_MAILCHAIN_ADDRESS || 'getantonio.eth';

export function EmailValidationDialog({ isOpen, onClose, onValidated }: EmailValidationDialogProps) {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [step, setStep] = useState<'connect' | 'email' | 'code'>('connect');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { signMessage } = useSignMessage();

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendVerificationCode = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!address) {
        setError('Please connect your wallet first');
        return;
      }

      const code = generateVerificationCode();
      setGeneratedCode(code);

      // Create message to sign
      const message = `Sign this message to verify your email address: ${email}\nVerification code: ${code}`;
      
      // Request signature from user's wallet
      const signature = await signMessage({ message });
      
      // Initialize Mailchain with user's wallet
      const mailchain = await Mailchain.fromWallet();
      
      // Send verification email to user
      await mailchain.sendMail({
        from: address, // Uses the connected wallet address
        to: [email],
        subject: 'TokenHub Email Verification',
        content: {
          text: `Your verification code is: ${code}`,
          html: `
            <h2>TokenHub Email Verification</h2>
            <p>Your verification code is: <strong>${code}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>Verified by wallet: ${address}</p>
          `
        }
      });

      // Send notification to factory owner
      await mailchain.sendMail({
        from: address,
        to: [FACTORY_OWNER_ADDRESS],
        subject: 'New TokenHub Email Verification',
        content: {
          text: `New user verification:
Email: ${email}
Wallet: ${address}
Network: ${window.ethereum ? await window.ethereum.networkVersion : 'unknown'}`,
          html: `
            <h2>New TokenHub User Verification</h2>
            <p><strong>User Email:</strong> ${email}</p>
            <p><strong>Wallet Address:</strong> ${address}</p>
            <p><strong>Network:</strong> ${window.ethereum ? await window.ethereum.networkVersion : 'unknown'}</p>
            <p>This user is currently verifying their email to deploy a token.</p>
          `
        }
      });

      setStep('code');
    } catch (err) {
      setError('Failed to send verification code. Please try again.');
      console.error('Error sending verification code:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = () => {
    if (verificationCode === generatedCode) {
      onValidated(email);
      onClose();
    } else {
      setError('Invalid verification code. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'email') {
      sendVerificationCode();
    } else if (step === 'code') {
      verifyCode();
    }
  };

  // If wallet is connected, move to email step
  React.useEffect(() => {
    if (isConnected && step === 'connect') {
      setStep('email');
    }
  }, [isConnected, step]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle>Verify Your Email</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {step === 'connect' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Please connect your wallet to continue with email verification.
                Your wallet will be used to sign and send the verification email.
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={() => setStep('email')}
                disabled={!isConnected}
              >
                {isConnected ? 'Continue' : 'Connect Wallet'}
              </Button>
            </div>
          ) : step === 'email' ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !email || !isConnected}
              >
                {isLoading ? <Spinner className="w-4 h-4" /> : 'Send Verification Code'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium mb-2">
                  Verification Code
                </label>
                <Input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full"
                  required
                  maxLength={6}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || verificationCode.length !== 6}
              >
                {isLoading ? <Spinner className="w-4 h-4" /> : 'Verify Code'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setStep('email')}
              >
                Back to Email
              </Button>
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
} 