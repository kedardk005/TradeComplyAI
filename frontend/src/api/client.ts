const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

let memoryToken: string | null = null;

export const setClientToken = (token: string | null) => {
  memoryToken = token;
};

export interface ApiErrorPayload {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface ApiError {
  status: number;
  error: ApiErrorPayload;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (memoryToken) {
    headers.set('Authorization', `Bearer ${memoryToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorPayload: ApiErrorPayload = data?.error || {
      code: 'HTTP_ERROR',
      message: typeof data === 'string' && data ? data : `HTTP error! status: ${response.status}`
    };

    throw {
      status: response.status,
      error: errorPayload
    } as ApiError;
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'GET' }),
  
  post: <T>(path: string, body?: any, options?: RequestInit) => 
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    }),
  
  put: <T>(path: string, body?: any, options?: RequestInit) => 
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    }),
  
  delete: <T>(path: string, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'DELETE' })
};
