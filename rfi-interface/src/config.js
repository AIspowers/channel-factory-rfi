// Config for the RFI interface application

// Base API URL - will use environment variable in production or fallback to localhost for development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

// Enable/disable debug logging
export const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true' || false;

// Endpoints
export const ENDPOINTS = {
  SEARCH: '/search',
  FEEDBACK: '/feedback',
  CONVERSATIONS: '/conversations',
  FEEDBACK_STATS: '/feedback/stats'
};

// Default settings
export const DEFAULT_SETTINGS = {
  MAX_SOURCES: 5,
}; 