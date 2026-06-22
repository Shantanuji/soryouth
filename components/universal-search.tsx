
'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Search, User, Briefcase, UserX, Archive, Loader2 } from 'lucide-react';
import { universalSearch, SearchResult } from '@/app/(app)/search/actions';
import { useDebounce } from '@/hooks/use-debounce';
import { DialogTitle } from '@/components/ui/dialog';

const ResultIcon = ({ type }: { type: SearchResult['type'] }) => {
  switch (type) {
    case 'Lead': return <User className="mr-2 h-4 w-4 text-blue-500" />;
    case 'Client': return <Briefcase className="mr-2 h-4 w-4 text-primary" />;
    case 'Dropped': return <UserX className="mr-2 h-4 w-4 text-red-500" />;
    case 'Inactive': return <Archive className="mr-2 h-4 w-4 text-gray-500" />;
    default: return <User className="mr-2 h-4 w-4" />;
  }
};

export function UniversalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length > 1) {
      startTransition(async () => {
        const searchResults = await universalSearch(debouncedQuery);
        setResults(searchResults);
      });
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const onSelect = (link: string) => {
    router.push(link);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <div 
        className="flex items-center w-full max-w-[240px] rounded-lg border border-border bg-card overflow-hidden h-9 shadow-sm cursor-pointer hover:border-border/80 transition-colors" 
        onClick={() => setOpen(true)}
      >
        <span className="flex-grow pl-3 text-xs text-muted-foreground select-none">
          Quick Search...
        </span>
        <div className="h-full px-3 bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:bg-primary/90 active:bg-primary/80 transition-colors">
          <Search className="h-3.5 w-3.5" />
        </div>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Universal Search</DialogTitle>
        <CommandInput
          placeholder="Search by name, email, or phone..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isPending && <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>}
          
          {!isPending && results.length === 0 && query.length > 1 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {results.length > 0 && (
            <CommandGroup heading="Results">
              {results.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={`${item.name}-${item.identifier}`}
                  onSelect={() => onSelect(item.link)}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <ResultIcon type={item.type} />
                    <div>
                        <p>{item.name}</p>
                        {item.identifier && <p className="text-xs text-muted-foreground">{item.identifier}</p>}
                    </div>
                  </div>
                  <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm">{item.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
