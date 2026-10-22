const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errorData = await res.json();
      errorMsg = errorData.message || errorMsg;
    } catch {
      // Keep status text
    }
    throw new Error(errorMsg);
  }

  return res.json();
}
