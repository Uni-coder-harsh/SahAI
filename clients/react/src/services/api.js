const getBaseUrl = () => {
  // Check if a custom URL is stored
  const customUrl = localStorage.getItem('custom_api_url');
  if (customUrl) return customUrl.trim();

  // Check Vite env variables
  if (import.meta.env && import.meta.env.VITE_API_URL) {
    let url = import.meta.env.VITE_API_URL.trim();
    if (!url.endsWith('/api') && !url.endsWith('/api/')) {
      url = url.endsWith('/') ? `${url}api` : `${url}/api`;
    }
    return url;
  }

  // Fallback to absolute or window pathing
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3000/api';
};

class ApiService {
  constructor() {
    this.token = localStorage.getItem('auth_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  get headers() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async _request(endpoint, options = {}) {
    const url = `${getBaseUrl()}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {
      throw new Error(`Failed to parse API response. Raw response: ${text}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.statusCode || response.status}`);
    }

    return data;
  }

  async signup(payload) {
    const data = await this._request('/users/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async login(payload) {
    const data = await this._request('/users/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async personalize(userId, payload) {
    return this._request(`/users/${userId}/personalize`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async fetchCognitiveState(userId) {
    const data = await this._request(`/users/${userId}/cognitive-state`);
    return data.cognitive_state || [];
  }

  async fetchUserProfile(userId) {
    return this._request(`/users/${userId}`);
  }

  async fetchCurriculum(domain, userId = null) {
    const query = userId ? `?user_id=${userId}` : '';
    return this._request(`/curriculum/${domain}${query}`);
  }

  async fetchInitialQuestions() {
    return this._request('/questions/initial');
  }

  async submitAnswer(payload) {
    return this._request('/questions/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async fetchPracticeQuestions(userId) {
    return this._request(`/questions/practice?user_id=${userId}`);
  }

  async sendTelemetry(payload) {
    return this._request('/telemetry', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();
