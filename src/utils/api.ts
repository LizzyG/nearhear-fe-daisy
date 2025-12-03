// Generic fetch function for API calls
export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Generic fetch function for making API calls
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, body, headers)
 * @returns Promise resolving to the parsed JSON response
 * @throws Error if the request fails
 */
export const apiFetch = async <T>(url: string, options: FetchOptions = {}): Promise<T> => {
  const { method = 'GET', body, headers = {} } = options;

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
  };

  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (status ${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
};


