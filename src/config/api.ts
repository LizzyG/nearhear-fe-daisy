const API_BASES = {
  prod: 'https://nearhear.app',
  local: 'http://localhost:1024',
} as const;

type ApiEnvironment = keyof typeof API_BASES;

const sanitizeSegment = (segment: string) => segment.replace(/\/+$/, '');

const resolveEnvironment = (): ApiEnvironment => {
  const env = import.meta.env.VITE_API_ENV;
  if (env === 'local' || env === 'prod') {
    return env;
  }
  return 'prod';
};

export const apiEnvironment: ApiEnvironment = resolveEnvironment();
export const apiBaseUrl: string = API_BASES[apiEnvironment];

export const resolveApiPath = (path: string) => {
  const normalizedBase = sanitizeSegment(apiBaseUrl);
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
};

export const apiConfig = {
  baseUrl: apiBaseUrl,
  environment: apiEnvironment,
};
