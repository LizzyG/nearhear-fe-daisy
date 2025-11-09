const API_BASES = {
  prod: 'https://nearhear.app',
  local: 'http://localhost:3000',
} as const;

type ApiEnvironment = keyof typeof API_BASES;

const sanitizeSegment = (segment: string) => segment.replace(/\/+$/, '');

const resolveEnvironment = (): ApiEnvironment => {
  if (typeof window !== 'undefined') {
    const env = window.__NEARHEAR_API_ENV__;
    if (env === 'local') {
      return 'local';
    }
  }

  return 'prod';
};

export const apiEnvironment: ApiEnvironment = resolveEnvironment();
export const apiBaseUrl = API_BASES[apiEnvironment];

export const resolveApiPath = (path: string) => {
  const normalizedBase = sanitizeSegment(apiBaseUrl);
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
};

export const apiConfig = {
  baseUrl: apiBaseUrl,
  environment: apiEnvironment,
};
