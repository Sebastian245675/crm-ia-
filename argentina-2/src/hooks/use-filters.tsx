import { useState, useEffect } from 'react';
import { db } from '@/firebase';

export interface FilterOption {
  id: string;
  name: string;
  order: number;
}

export interface Filter {
  id: string;
  name: string;
  order: number;
  options: FilterOption[];
}

export function useFilters() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);

  const isSupabase = typeof (db as any)?.from === 'function';

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      setLoading(true);
      if (isSupabase) {
        // Cargar filtros desde Supabase
        const { data: filtersData, error: filtersError } = await db
          .from('filters')
          .select('*')
          .order('order', { ascending: true });

        if (filtersError) {
          console.error('Error loading filters:', filtersError);
          setFilters([]);
          return;
        }

        const { data: optionsData, error: optionsError } = await db
          .from('filter_options')
          .select('*')
          .order('order', { ascending: true });

        if (optionsError) {
          console.error('Error loading filter options:', optionsError);
          setFilters([]);
          return;
        }

        const filtersWithOptions = (filtersData || []).map((filter: any) => ({
          id: filter.id,
          name: filter.name,
          order: filter.order || 0,
          options: (optionsData || [])
            .filter((opt: any) => opt.parent_id === filter.id)
            .map((opt: any) => ({
              id: opt.id,
              name: opt.name,
              order: opt.order || 0
            }))
        }));

        setFilters(filtersWithOptions);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
      setFilters([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    filters,
    loading,
    refetch: fetchFilters
  };
}
