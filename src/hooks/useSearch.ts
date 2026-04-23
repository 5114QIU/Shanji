/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { DramaEntry } from '../types';

export function useSearch(entries: DramaEntry[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return entries.filter(entry =>
      entry.title.toLowerCase().includes(query) ||
      entry.actors.some(actor => actor.toLowerCase().includes(query))
    );
  }, [entries, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults
  };
}
