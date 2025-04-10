import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FiZap, FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnnouncementModal({ isOpen, onClose }: AnnouncementModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Development Update</DialogTitle>
          <Button 
            variant="ghost"
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-white p-1"
          >
            <FiX className="h-5 w-5" />
          </Button>
        </DialogHeader>
        <DialogDescription className="mt-4 text-gray-300">
          <p>TokenHub is undergoing active development to integrate the Stacks network (Bitcoin L2) alongside EVM chains.</p>
          <p className="mt-2">This means you'll soon be able to create and manage both standard ERC-20 tokens and Stacks-based SIP-010 tokens directly from this platform.</p>
          <p className="mt-2">Thank you for your patience as we build out these exciting new features!</p>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
} 