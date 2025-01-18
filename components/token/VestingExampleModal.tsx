"use client";

import React from 'react';
import { Card } from '@/components/ui/card';

interface VestingExampleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VestingExampleModal = ({ isOpen, onClose }: VestingExampleModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-2xl p-4">
        <Card className="bg-gray-800 text-white">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Vesting Schedule Example</h3>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Timeline Visualization */}
              <div className="relative h-20 bg-gray-700 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="w-1/4 bg-gray-600 border-r border-gray-500">
                    <div className="p-2 text-xs">Cliff Period</div>
                  </div>
                  <div className="w-3/4 bg-gradient-to-r from-blue-600/50 to-blue-600">
                    <div className="p-2 text-xs">Linear Vesting</div>
                  </div>
                </div>
                {/* Timeline markers */}
                <div className="absolute bottom-0 w-full flex justify-between text-xs px-2 py-1 bg-gray-800/50">
                  <span>Launch</span>
                  <span>3 months</span>
                  <span>12 months</span>
                </div>
              </div>

              {/* Example Explanation */}
              <div className="space-y-3 text-sm">
                <h4 className="font-medium">Example: 12-Month Vesting with 3-Month Cliff</h4>
                
                <div className="space-y-2">
                  <p className="text-gray-300">
                    <span className="text-gray-400">Initial Period (0-3 months):</span><br/>
                    • No tokens are unlocked during this period<br/>
                    • Team must wait until cliff period ends
                  </p>

                  <p className="text-gray-300">
                    <span className="text-gray-400">Linear Vesting (3-12 months):</span><br/>
                    • Tokens start unlocking gradually<br/>
                    • ~11.11% unlocks each month<br/>
                    • Ensures steady distribution
                  </p>

                  <p className="text-gray-300">
                    <span className="text-gray-400">Final Result:</span><br/>
                    • Month 3: 0% unlocked<br/>
                    • Month 6: ~33% unlocked<br/>
                    • Month 9: ~66% unlocked<br/>
                    • Month 12: 100% unlocked
                  </p>
                </div>

                <div className="mt-4 p-3 bg-blue-900/20 rounded-lg">
                  <h5 className="font-medium mb-2">Why Use Vesting?</h5>
                  <ul className="list-disc list-inside text-gray-300 space-y-1">
                    <li>Ensures long-term commitment from team</li>
                    <li>Prevents immediate selling pressure</li>
                    <li>Builds investor confidence</li>
                    <li>Standard practice in token economics</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}; 