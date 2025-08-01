
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
    case 'Client': return <Briefcase className="mr-2 h-4 w-4 text-green-500" />;
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
      <Button
        variant="outline"
        className="w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search anything...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
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
