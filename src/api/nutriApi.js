import { Capacitor } from '@capacitor/core';

const DEPLOYED_API_BASE_URL = 'https://nutriai-rt1k.onrender.com';

const nativeDevApiUrl = () => {
  if (!Capacitor.isNativePlatform()) return '';
  return DEPLOYED_API_BASE_URL;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || nativeDevApiUrl();

async function request(path, options = {}) {
  const storedUser = JSON.parse(localStorage.getItem('nutriai_user') || 'null');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(storedUser?.email ? { 'X-User-Email': storedUser.email } : {}),
      ...(storedUser?.nickname ? { 'X-User-Nickname': storedUser.nickname } : {}),
      ...(storedUser?.name ? { 'X-User-Name': storedUser.name } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const error = await response.json();
      message = error.error || error.message || message;
    } catch {
      // Keep the generic message when the server did not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function createEntityClient(entityName) {
  const basePath = `/api/entities/${entityName}`;

  return {
    list(sort, limit) {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', String(limit));
      const query = params.toString();
      return request(`${basePath}${query ? `?${query}` : ''}`);
    },

    filter(filters = {}, sort, limit) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.set(key, String(value));
      });
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', String(limit));
      const query = params.toString();
      return request(`${basePath}${query ? `?${query}` : ''}`);
    },

    create(data) {
      return request(basePath, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id, data) {
      return request(`${basePath}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete(id) {
      return request(`${basePath}/${id}`, { method: 'DELETE' });
    },
  };
}

export const nutriApi = {
  entities: {
    UserProfile: createEntityClient('UserProfile'),
    FoodLog: createEntityClient('FoodLog'),
    WaterLog: createEntityClient('WaterLog'),
    WeightLog: createEntityClient('WeightLog'),
    BodyMeasurement: createEntityClient('BodyMeasurement'),
    Achievement: createEntityClient('Achievement'),
    MealPlan: createEntityClient('MealPlan'),
  },

  integrations: {
    Core: {
      InvokeLLM(payload) {
        return request('/api/ai/invoke', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      },

      UploadFile({ file }) {
        const formData = new FormData();
        formData.append('file', file);
        return request('/api/files', {
          method: 'POST',
          body: formData,
        });
      },
    },
  },

  auth: {
    me() {
      return request('/api/auth/me');
    },

    register(data) {
      return request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    login(data) {
      return request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    requestCode(data) {
      return request('/api/auth/request-code', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    verifyRegister(data) {
      return request('/api/auth/verify-register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    logout() {
      return Promise.resolve();
    },

    redirectToLogin() {
      return Promise.resolve();
    },
  },
};
