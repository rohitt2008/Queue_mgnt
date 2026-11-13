const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('qflow_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  }

  // Auth endpoints
  async login(credentials: { email: string; password: string }) {
    return this.request<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: { name: string; email: string; password: string; role?: string }) {
    return this.request<{ success: boolean; token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async me() {
    return this.request<{ success: boolean; user: any }>('/auth/me');
  }

  // Queue endpoints
  async getQueues() {
    return this.request<{ success: boolean; queues: any[] }>('/queues');
  }

  async getQueueById(id: string) {
    return this.request<{ success: boolean; queue: any }>(`/queues/${id}`);
  }

  async createQueue(data: {
    name: string;
    description?: string;
    prefix: string;
    color?: string;
    icon?: string;
    targetServiceTime?: number;
    counterName?: string;
  }) {
    return this.request<{ success: boolean; queue: any }>('/queues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQueue(id: string, data: Partial<any>) {
    return this.request<{ success: boolean; queue: any }>(`/queues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteQueue(id: string) {
    return this.request<{ success: boolean; message: string }>(`/queues/${id}`, {
      method: 'DELETE',
    });
  }

  // Token endpoints
  async getQueueTokens(queueId: string, status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<{
      success: boolean;
      tokens: any[];
      waitingTokens: any[];
      servingToken: any | null;
      totalWaiting: number;
    }>(`/tokens/queue/${queueId}${query}`);
  }

  async addToken(
    queueId: string,
    data: {
      customerName: string;
      customerPhone?: string;
      customerEmail?: string;
      priority?: string;
      notes?: string;
    }
  ) {
    return this.request<{ success: boolean; token: any }>(`/tokens/queue/${queueId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async moveToken(tokenId: string, direction: 'up' | 'down') {
    return this.request<{ success: boolean; tokens: any[] }>(`/tokens/${tokenId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ direction }),
    });
  }

  async serveTopToken(queueId: string, autoFinishServing: boolean = true) {
    return this.request<{
      success: boolean;
      servedToken: any;
      waitingTokens: any[];
    }>(`/tokens/queue/${queueId}/serve-top`, {
      method: 'POST',
      body: JSON.stringify({ autoFinishServing }),
    });
  }

  async completeToken(tokenId: string) {
    return this.request<{ success: boolean; token: any }>(`/tokens/${tokenId}/complete`, {
      method: 'POST',
    });
  }

  async cancelToken(tokenId: string, reason?: string) {
    return this.request<{ success: boolean; token: any; waitingTokens: any[] }>(
      `/tokens/${tokenId}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
  }

  // Analytics endpoints
  async getAnalytics(queueId?: string, timeframe: string = 'today') {
    const q = queueId ? `/${queueId}` : '';
    return this.request<{
      success: boolean;
      summary: any;
      hourlyTrend: any[];
      dailyTrend: any[];
      priorityData: any[];
      statusData: any[];
      queueComparison: any[];
    }>(`/analytics${q}?timeframe=${timeframe}`);
  }
}

export const api = new ApiService();
