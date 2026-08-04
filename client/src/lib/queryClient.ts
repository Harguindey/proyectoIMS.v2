import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Helper function for requests that return JSON data
export async function apiRequestJson<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const response = await apiRequest(method, url, data);
  return await response.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false, // Deshabilitado: solo actualiza manualmente o al invalidar
      refetchOnWindowFocus: false, // No actualizar al enfocar ventana para evitar parpadeos
      staleTime: 30000, // Datos frescos por 30 segundos
      gcTime: 300000, // Cache por 5 minutos (TanStack Query v5)
      retry: 2, // Reintentar 2 veces en caso de error de red
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
    },
    mutations: {
      retry: false,
    },
  },
});

// Helper para invalidar queries relacionadas rápidamente
export const invalidateRelatedQueries = async (entityType: string) => {
  const queries = {
    products: [
      "/api/products",
      "/api/products/low-stock", 
      "/api/products/needing-reorder",
      "/api/dashboard/metrics"
    ],
    suppliers: [
      "/api/suppliers",
      "/api/dashboard/metrics"
    ],
    movements: [
      "/api/stock-movements",
      "/api/stock-movements/recent",
      "/api/dashboard/metrics",
      "/api/products"
    ],
    procurement: [
      "/api/procurement-plans",
      "/api/procurement-plans/upcoming",
      "/api/dashboard/metrics"
    ],
    zones: [
      "/api/warehouse-zones",
      "/api/dashboard/metrics"
    ]
  };

  const queryKeys = queries[entityType as keyof typeof queries] || [];
  
  // Invalidar todas las queries relacionadas en paralelo
  await Promise.all(
    queryKeys.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
  );
};
