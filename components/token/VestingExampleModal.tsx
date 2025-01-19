"use client";

import React from 'react';

interface VestingExampleModalProps {
  onClose: () => void;
}

export function VestingExampleModal({ onClose }: VestingExampleModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Vesting Schedule Example</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">12-Month Vesting with 3-Month Cliff</h3>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="space-y-2">
                <p>• Months 0-3: No tokens unlocked (cliff period)</p>
                <p>• Month 3: Initial unlock of 25% of tokens</p>
                <p>• Months 4-12: Remaining 75% unlocks linearly</p>
                <p>• Month 12: All tokens fully unlocked</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Benefits</h3>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="space-y-2">
                <p>• Ensures long-term commitment from team</p>
                <p>• Protects investors from early dumps</p>
                <p>• Aligns team incentives with project success</p>
                <p>• Industry standard practice</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 