import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  Search, 
  Package, 
  Users, 
  ShoppingCart, 
  Building2, 
  MapPin, 
  ArrowUpDown,
  X,
  Clock,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: number;
  type: string;
  title: string;
  subtitle: string;
  category: string;
  url: string;
}

interface SearchResponse {
  query: string;
  total: number;
  results: {
    products: SearchResult[];
    customers: SearchResult[];
    orders: SearchResult[];
    suppliers: SearchResult[];
    zones: SearchResult[];
    movements: SearchResult[];
    all: SearchResult[];
  };
}

const getTypeIcon = (type: string) => {
  const icons = {
    product: Package,
    customer: Users,
    order: ShoppingCart,
    supplier: Building2,
    zone: MapPin,
    movement: ArrowUpDown
  };
  return icons[type as keyof typeof icons] || Search;
};

const getTypeColor = (type: string) => {
  const colors = {
    product: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    customer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    order: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    supplier: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    zone: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    movement: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300"
  };
  return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
};

// Utility function to highlight search terms
const highlightText = (text: string, searchTerm: string) => {
  if (!searchTerm || searchTerm.length < 2) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (regex.test(part)) {
      return (
        <mark 
          key={index} 
          className="bg-yellow-200 dark:bg-yellow-800 text-current"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
};

export function SearchBar({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [, navigate] = useLocation();
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounced search query (for full search with AI fallback)
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Fast debounced query (for instant suggestions without AI)
  const [fastDebouncedQuery, setFastDebouncedQuery] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFastDebouncedQuery(query);
    }, 150); // Faster for instant suggestions
    
    return () => clearTimeout(timer);
  }, [query]);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('search-history');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  }, []);

  // Fast suggestions API call (without AI overhead)
  const { data: suggestions, isLoading: suggestionsLoading } = useQuery<SearchResponse>({
    queryKey: [`/api/search/suggestions?q=${encodeURIComponent(fastDebouncedQuery)}`],
    enabled: !!fastDebouncedQuery && fastDebouncedQuery.length >= 2,
    staleTime: 30000 // Cache results for 30 seconds
  });

  // Full search API call (with AI fallback if needed)
  const { data: searchResults, isLoading } = useQuery<SearchResponse>({
    queryKey: [`/api/search?q=${encodeURIComponent(debouncedQuery)}`],
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
    staleTime: 30000 // Cache results for 30 seconds
  });

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Global Ctrl+K / Cmd+K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      // ESC to close
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
      }

      // Arrow navigation when search is open
      if (isOpen && searchResults?.results.all.length) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.results.all.length - 1 ? prev + 1 : 0
          );
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.results.all.length - 1
          );
        } else if (event.key === 'Enter' && selectedIndex >= 0) {
          event.preventDefault();
          const result = searchResults.results.all[selectedIndex];
          handleResultClick(result);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  const handleResultClick = (result: SearchResult) => {
    // Save to history
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('search-history', JSON.stringify(newHistory));
    
    // Navigate to result
    navigate(result.url);
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(-1);
  };

  const clearQuery = () => {
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('search-history');
  };

  const showResults = isOpen && (debouncedQuery.length >= 2 || searchHistory.length > 0);

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={compact ? "Buscar..." : "Buscar productos, clientes, pedidos... (Ctrl+K)"}
          className="pl-10 pr-10"
          data-testid="search-input"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearQuery}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            data-testid="search-clear"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {(isLoading || suggestionsLoading) && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-hidden shadow-lg">
          <CardContent className="p-0">
            <div ref={resultsRef} className="max-h-96 overflow-y-auto">
              {/* Search History */}
              {debouncedQuery.length < 2 && searchHistory.length > 0 && (
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Búsquedas recientes
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-6 text-xs"
                    >
                      Limpiar
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {searchHistory.slice(0, 5).map((historyQuery, index) => (
                      <button
                        key={index}
                        onClick={() => handleHistoryClick(historyQuery)}
                        className="block w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors"
                      >
                        {historyQuery}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results or Suggestions */}
              {((searchResults && debouncedQuery.length >= 2) || (suggestions && fastDebouncedQuery.length >= 2)) && (() => {
                // Prefer full search results over suggestions
                const dataToShow = searchResults || suggestions;
                const queryToShow = debouncedQuery || fastDebouncedQuery;
                const isSuggestion = !searchResults && suggestions;
                
                return dataToShow && dataToShow.results.all.length > 0 ? (
                  <div className="p-2">
                    <div className="text-xs text-muted-foreground mb-2 px-2">
                      {isSuggestion && <span className="text-blue-600 dark:text-blue-400">Sugerencias: </span>}
                      {dataToShow.total} resultado{dataToShow.total !== 1 ? 's' : ''} para "{queryToShow}"
                    </div>
                    {dataToShow.results.all.map((result, index) => {
                      const Icon = getTypeIcon(result.type);
                      const isSelected = index === selectedIndex;
                      
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultClick(result)}
                          className={cn(
                            "w-full text-left p-3 rounded-md hover:bg-muted transition-colors",
                            isSelected && "bg-muted"
                          )}
                          data-testid={`search-result-${result.type}-${result.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">
                                  {highlightText(result.title, queryToShow)}
                                </span>
                                <Badge 
                                  variant="secondary" 
                                  className={cn("text-xs", getTypeColor(result.type))}
                                >
                                  {result.category}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {highlightText(result.subtitle, queryToShow)}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No se encontraron resultados para "{queryToShow}"
                  </div>
                );
              })()}

              {/* Empty state when no query */}
              {debouncedQuery.length < 2 && searchHistory.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Escribe al menos 2 caracteres para buscar
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}