import { config } from '../config';

export class ApiClient {
  private baseUrl: string;
  private token: string;
  
  constructor(baseUrl: string = config.apiUrl, token: string = config.apiToken) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async makeRequest(endpoint: string, options: RequestInit = {}) {
    return fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  // Convenience methods
  async get(endpoint: string) {
    return this.makeRequest(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data?: any) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: any) {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string) {
    return this.makeRequest(endpoint, { method: 'DELETE' });
  }
}

// Export a default instance
export const apiClient = new ApiClient();
