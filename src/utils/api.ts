import { resolveApiPath } from '@/config/api';

// Generic fetch function for API calls
export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: string;
  headers?: Record<string, string>;
}

/**
 * Generic fetch function for making API calls
 * Automatically prepends the API base URL from config
 * @param path - The API endpoint path (e.g., '/media/getSupportedCities')
 * @param options - Fetch options (method, body, headers)
 * @returns Promise resolving to the parsed JSON response
 * @throws Error if the request fails
 */
export const apiFetch = async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
  const { method = 'GET', body, headers = {} } = options;

  const url = resolveApiPath(path);

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = {
    method,
    headers: defaultHeaders,
    credentials: 'include', // Include cookies for auth
  };

  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body) {
    fetchOptions.body = body;
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (status ${response.status}): ${errorText}`);
  }

  // Handle empty responses (e.g., 200 OK with no body)
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    // If it's not valid JSON, return the text as-is
    return text as T;
  }
};
