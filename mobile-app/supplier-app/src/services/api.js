// API Configuration
const API_BASE_URL = 'https://dairymanage-erp.preview.emergentagent.com/api';

export const API = {
  BASE_URL: API_BASE_URL,
  
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/supplier-portal/login`,
  CHANGE_PASSWORD: `${API_BASE_URL}/supplier-portal/change-password`,
  RECOVER_PASSWORD: `${API_BASE_URL}/supplier-portal/recover-password`,
  
  // Supplier endpoints
  GET_DASHBOARD: (supplierId) => `${API_BASE_URL}/supplier-portal/${supplierId}/dashboard`,
  GET_SUPPLIES: (supplierId) => `${API_BASE_URL}/supplier-portal/${supplierId}/supplies`,
  GET_BALANCE_HISTORY: (supplierId) => `${API_BASE_URL}/supplier-portal/${supplierId}/balance-history`,
  
  // Feed request
  SUBMIT_FEED_REQUEST: `${API_BASE_URL}/supplier-portal/feed-request`,
  GET_FEED_REQUESTS: (supplierId) => `${API_BASE_URL}/supplier-portal/${supplierId}/feed-requests`,
  
  // Messages
  SEND_MESSAGE: `${API_BASE_URL}/supplier-portal/messages`,
  GET_MESSAGES: (supplierId) => `${API_BASE_URL}/supplier-portal/${supplierId}/messages`,
};

export default API;
