// API base URL configuration
// For local development (Docker), uncomment the line below and comment out the production URL:
// const API_BASE = '';
const API_BASE = import.meta.env.VITE_API_URL || 'https://phsen-newui.onrender.com';

export const api = (path: string) => `${API_BASE}${path}`;
