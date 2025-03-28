// Configuration for the RFI interface

// Get the API base URL from environment variables
// This allows us to switch between different backends
const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8002';

// Determine which API implementation we're using based on the port
const isResponsesApi = apiBaseUrl.includes(':8002');

// Export the configuration
export default {
  apiBaseUrl,
  isResponsesApi,
  apiName: isResponsesApi ? 'RFI Responses API' : 'RFI Assistant API',
  apiVersion: '1.0.0'
}; 