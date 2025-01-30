import { useState } from 'react';

type Category = 'all' | 'live' | 'upcoming' | 'ended' | 'trending' | 'new';

interface TokenCategoryFilterProps {
  onCategoryChange: (category: Category) => void;
  activeCategory: Category;
}

export function TokenCategoryFilter({ onCategoryChange, activeCategory }: TokenCategoryFilterProps) {
  const categories: { id: Category; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'live', label: 'Live Sales' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'ended', label: 'Ended' },
    { id: 'trending', label: 'Trending' },
    { id: 'new', label: 'New' },
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-6">
      {categories.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onCategoryChange(id)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            activeCategory === id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export type { Category };