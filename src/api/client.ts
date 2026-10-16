import {
  User,
  Certificate,
  VerificationResponse,
  DashboardStats,
} from '../types';

export const TOKEN_STORAGE_KEY = 'certichain_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage exceptions
  }
}

async function fetchJson<T>(url: string, options?: RequestInit, isRetry = false): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as any),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && !isRetry && !url.includes('/api/v1/auth/')) {
    // Attempt automatic session recovery using demo credentials
    try {
      const demoRes = await fetch('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
        credentials: 'include',
      });
      if (demoRes.ok) {
        const demoData = await demoRes.json();
        if (demoData.token) {
          setStoredToken(demoData.token);
          return await fetchJson<T>(url, options, true);
        }
      }
    } catch {
      // Fall through to standard error handling
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
}

export const authApi = {
  async getMe(): Promise<{ authenticated: boolean; user: User | null }> {
    return fetchJson('/api/v1/auth/me');
  },

  async login(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    const res = await fetchJson<{ user: User; token: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async demoLogin(role: 'admin' | 'issuer' | 'student1' | 'student2'): Promise<{ user: User; token: string }> {
    const res = await fetchJson<{ user: User; token: string }>('/api/v1/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async logout(): Promise<void> {
    try {
      await fetchJson('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },
};

export const certificatesApi = {
  async getAll(params?: { search?: string; state?: string }): Promise<{ total: number; certificates: Certificate[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.state) query.set('state', params.state);
    return fetchJson(`/api/v1/certificates?${query.toString()}`);
  },

  async getById(id: string): Promise<{ certificate: Certificate; blockchainProof: any }> {
    return fetchJson(`/api/v1/certificates/${encodeURIComponent(id)}`);
  },

  async issue(data: {
    studentId: string;
    studentName: string;
    degreeName: string;
    department: string;
    graduationYear: number;
    gradeClassification: string;
    issueDate: string;
    studentEmail?: string;
  }): Promise<{ message: string; certificate: Certificate }> {
    return fetchJson('/api/v1/certificates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async revoke(id: string, reason: string): Promise<{ message: string; certificate: Certificate }> {
    return fetchJson(`/api/v1/certificates/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async simulateTamper(id: string, active: boolean, tamperedGrade?: string): Promise<{ certificate: Certificate; message: string }> {
    return fetchJson(`/api/v1/certificates/${encodeURIComponent(id)}/simulate-tamper`, {
      method: 'POST',
      body: JSON.stringify({ active, tamperedGrade }),
    });
  },

  getPdfUrl(id: string): string {
    const token = getStoredToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `/api/v1/certificates/${encodeURIComponent(id)}/pdf${tokenParam}`;
  },

  async downloadPdf(certificateId: string, studentName?: string): Promise<void> {
    const token = getStoredToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const primaryUrl = `/api/v1/certificates/${encodeURIComponent(certificateId)}/pdf${tokenParam}`;

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(primaryUrl, { headers, credentials: 'include' });
    
    // If certificates route failed, try the public verify PDF endpoint
    if (!response.ok) {
      const fallbackUrl = `/api/v1/verify/${encodeURIComponent(certificateId)}/pdf`;
      response = await fetch(fallbackUrl, { credentials: 'include' });
    }

    if (!response.ok) {
      throw new Error(`Failed to download signed PDF: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    const safeName = studentName ? studentName.replace(/\s+/g, '_') : 'Diploma';
    a.download = `${certificateId}_Signed_${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 2000);
  },
};

export const verifyApi = {
  async verify(certificateId: string, source = 'DIRECT_LOOKUP'): Promise<VerificationResponse> {
    const url = `/api/v1/verify/${encodeURIComponent(certificateId)}?source=${encodeURIComponent(source)}`;
    const response = await fetch(url, { credentials: 'include' });
    const data = await response.json();
    return data as VerificationResponse;
  },
};

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    return fetchJson('/api/v1/dashboard/stats');
  },

  async getAuditEvents(): Promise<{ events: any[] }> {
    return fetchJson('/api/v1/dashboard/audit-events');
  },

  async getVerificationEvents(): Promise<{ events: any[] }> {
    return fetchJson('/api/v1/dashboard/verification-events');
  },
};

export const institutionsApi = {
  async getIssuers(): Promise<{ issuers: any[]; authorizedBlockchainAddresses: string[] }> {
    return fetchJson('/api/v1/institutions/issuers/list');
  },

  async createIssuer(data: { name: string; email: string; password: string; issuerAddress?: string }): Promise<any> {
    return fetchJson('/api/v1/institutions/issuers/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
