import axios from "axios";
import { clearAuth, getAccessToken, getRefreshToken, setAuth } from "../utils/auth";

const DEFAULT_API_BASE_URL = "/api";

const getConfiguredApiBaseEnv = () => {
  const candidate =
    typeof import.meta.env.VITE_API_URL === "string" && import.meta.env.VITE_API_URL.trim()
      ? import.meta.env.VITE_API_URL
      : import.meta.env.VITE_API_BASE_URL;

  return typeof candidate === "string" ? candidate.trim() : "";
};

const normalizeApiBaseUrl = (rawValue) => {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) {
    return DEFAULT_API_BASE_URL;
  }

  const withoutTrailingSlash = value.replace(/\/+$/, "");
  if (withoutTrailingSlash.endsWith("/api")) {
    return withoutTrailingSlash;
  }

  if (withoutTrailingSlash.startsWith("http://") || withoutTrailingSlash.startsWith("https://")) {
    return `${withoutTrailingSlash}/api`;
  }

  return withoutTrailingSlash.startsWith("/api") ? withoutTrailingSlash : `/api${withoutTrailingSlash}`;
};

export const API_BASE_URL = normalizeApiBaseUrl(getConfiguredApiBaseEnv());

export const unwrapApiData = (responseOrPayload) => {
  const payload = responseOrPayload?.data ?? responseOrPayload;
  return payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
};

export const unwrapApiMessage = (responseOrPayload, fallback = "") => {
  const payload = responseOrPayload?.data ?? responseOrPayload;
  return payload?.message || fallback;
};

export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.response?.data?.message
  || error?.response?.data?.errors?.[0]
  || error?.message
  || fallback;

export const getFieldErrors = (error) => {
  const payload = error?.response?.data;
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const metadataErrors = payload.metadata?.fieldErrors;
  if (metadataErrors && typeof metadataErrors === "object") {
    return metadataErrors;
  }

  const errors = payload.errors;
  if (!Array.isArray(errors)) {
    return {};
  }

  return errors.reduce((accumulator, entry) => {
    if (typeof entry !== "string") {
      return accumulator;
    }

    const separatorIndex = entry.indexOf(":");
    if (separatorIndex <= 0) {
      return accumulator;
    }

    const field = entry.slice(0, separatorIndex).trim();
    const message = entry.slice(separatorIndex + 1).trim();
    if (field && message) {
      accumulator[field] = message;
    }
    return accumulator;
  }, {});
};

export const normalizeSearchValue = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
});

const buildAuthHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const isPublicEndpoint = (urlPath, method = "get") => {
  if (urlPath.startsWith("/auth/")) {
    return true;
  }
  if (urlPath.startsWith("/public/")) {
    return true;
  }
  if (urlPath === "/dashboard/stats") {
    return true;
  }
  if (urlPath === "/health" || urlPath === "/health/ping") {
    return true;
  }
  if (urlPath.startsWith("/reviews/center/")) {
    return true;
  }
  if (urlPath.startsWith("/certificates/verify/")) {
    return true;
  }
  if (urlPath.startsWith("/certificate/verify/")) {
    return true;
  }
  return false;
};

const shouldAttachAuthHeader = (urlPath) =>
  !isPublicEndpoint(urlPath) || urlPath.startsWith("/public/") || urlPath === "/dashboard/stats";

apiClient.interceptors.request.use(async (config) => {
  config.baseURL = API_BASE_URL;

  const token = getAccessToken();
  const urlPath = config.url?.split("?")[0] || "";

  if (token && shouldAttachAuthHeader(urlPath)) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url?.split("?")[0] || "";

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isRefreshRequest = requestUrl.includes("/auth/refresh");
    const isPublicRequest = isPublicEndpoint(requestUrl, originalRequest.method);

    if (status === 401 && !originalRequest._retry && !isRefreshRequest && !isPublicRequest) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        try {
          const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const refreshedAuth = unwrapApiData(refreshResponse.data);
          setAuth(refreshedAuth, { remember: Boolean(window.localStorage.getItem("refreshToken")) });
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${refreshedAuth.accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          clearAuth();
          if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            const redirect = `${window.location.pathname}${window.location.search}`;
            window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
          }
          return Promise.reject(refreshError);
        }
      }

      clearAuth();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => apiClient.post("/auth/login", data),
  register: (data) => apiClient.post("/auth/register", data),
  refresh: (refreshToken) => apiClient.post("/auth/refresh", { refreshToken }),
  sendOtp: (data) => apiClient.post("/auth/resend-otp", { email: data.email }),
  verifyOtp: (data) => apiClient.post("/auth/verify-otp", data),
  forgotPassword: (email) => apiClient.post("/auth/forgot-password", { email }),
  resetPassword: (data) => apiClient.post("/auth/reset-password", data),
  verifyEmail: (token) => apiClient.get(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  resendVerification: (email) => apiClient.post("/auth/resend-otp", { email }),
  verifyTwoFactor: (data) => apiClient.post("/auth/2fa/verify", data)
};

export const publicAPI = {
  getDrives: (params) => apiClient.get("/public/drives", { params }),
  getCenters: (params = {}) => apiClient.get("/public/centers", { params: { page: 0, size: 50, ...params } }),
  getCitySuggestions: (query, limit = 8) => apiClient.get("/public/cities", {
    params: {
      query: normalizeSearchValue(query),
      limit
    }
  }),
  smartSearch: (params = {}) => apiClient.get("/public/search", { params }),
  getNearbyCenters: (params = {}) => apiClient.get("/public/nearby-centers", { params }),
  getCenterDetail: (id) => apiClient.get(`/public/centers/${id}`),
  getDriveSlots: (driveId) => apiClient.get(`/public/drives/${driveId}/slots`),
  getSummary: () => apiClient.get("/public/summary"),
  getStats: () => apiClient.get("/public/summary")
};

export const userAPI = {
  getProfile: () => apiClient.get("/users/me"),
  updateProfile: (data) => apiClient.put("/users/update-profile", data),
  requestPasswordChangeOtp: () => apiClient.post("/users/change-password/request-otp"),
  changePassword: (data) => apiClient.put("/users/change-password", data),
  getAccount: () => apiClient.get("/user/account"),
  getBookings: () => apiClient.get("/user/bookings"),
  bookSlot: (data) => apiClient.post("/user/bookings", data),
  cancelBooking: (bookingId) => apiClient.patch(`/user/bookings/${bookingId}/cancel`),
  rescheduleBooking: (bookingId, data) => apiClient.patch(`/user/bookings/${bookingId}/reschedule`, data),
  getNotifications: () => apiClient.get("/user/notifications"),
  markNotificationsRead: () => apiClient.patch("/user/notifications/read-all"),
  getSlotRecommendations: (params) => apiClient.get("/user/recommendations/slots", { params }),
  joinWaitlist: (slotId) => apiClient.post(`/user/slots/${slotId}/waitlist`),
  getWaitlist: () => apiClient.get("/user/waitlist")
};

const notificationEndpoints = {
  getNotifications: () => apiClient.get("/notifications"),
  getUnreadCount: () => apiClient.get("/notifications/unread-count"),
  markAsRead: (notificationId) => apiClient.patch(`/notifications/${notificationId}/read`),
  markAllRead: () => apiClient.patch("/notifications/read-all"),
  subscribeToSlot: (driveId) => apiClient.post(`/notifications/slots/subscribe/${driveId}`),
  unsubscribeFromSlot: (driveId) => apiClient.post(`/notifications/slots/unsubscribe/${driveId}`),
  getSubscriptions: () => apiClient.get("/notifications/slots/subscriptions")
};

export const adminAPI = {
  getDashboardStats: () => apiClient.get("/admin/dashboard/stats"),
  getDashboardAnalytics: () => apiClient.get("/admin/dashboard/analytics"),
  getSearchAnalytics: () => apiClient.get("/admin/search-analytics"),
  searchUsers: (query, limit = 8) => apiClient.get("/users/search", { params: { query, limit } }),
  createBooking: (data) => apiClient.post("/bookings", data),
  getAllBookings: () => apiClient.get("/admin/bookings"),
  getAllCenters: (params = {}) => apiClient.get("/admin/centers", { params: { page: 0, size: 500, ...params } }),
  getAllDrives: (params = {}) => apiClient.get("/admin/drives", { params }),
  getDriveById: (driveId) => apiClient.get(`/admin/drives/${driveId}`),
  getAllUsers: () => apiClient.get("/admin/users"),
  getAllSlots: (params = {}) => apiClient.get("/admin/slots", { params }),
  getAllSlotsList: (params = {}) => apiClient.get("/admin/slots/all", { params }),
  getDriveSlots: (driveId) => apiClient.get(`/admin/drives/${driveId}/slots`),
  createCenter: (data) => apiClient.post("/admin/centers", data),
  updateCenter: (centerId, data) => apiClient.put(`/admin/centers/${centerId}`, data),
  createDrive: (data) => apiClient.post("/admin/drives", data),
  updateDrive: (driveId, data) => apiClient.put(`/admin/drives/${driveId}`, data),
  createSlot: (data) => apiClient.post("/admin/slots", data),
  updateSlot: (slotId, data) => apiClient.put(`/admin/slots/${slotId}`, data),
  deleteSlot: (slotId) => apiClient.delete(`/admin/slots/${slotId}`),
  deleteCenter: (centerId) => apiClient.delete(`/admin/centers/${centerId}`),
  deleteDrive: (driveId) => apiClient.delete(`/admin/drives/${driveId}`),
  enableUser: (userId) => apiClient.patch(`/admin/users/${userId}/enable`),
  disableUser: (userId) => apiClient.patch(`/admin/users/${userId}/disable`),
  updateBookingStatus: (bookingId, status) => {
    const actionMap = {
      approve: "approve",
      reject: "reject",
      cancelled: "cancel",
      canceled: "cancel",
      cancel: "cancel",
      completed: "complete",
      complete: "complete",
      verified: "confirm",
      verify: "confirm",
      confirmed: "confirm",
      confirm: "confirm"
    };
    const action = actionMap[String(status || "").toLowerCase()];

    if (!action) {
      return Promise.reject(new Error("Invalid booking status action"));
    }

    return apiClient.patch(`/admin/bookings/${bookingId}/${action}`);
  },
  completeBooking: (bookingId) => apiClient.put(`/admin/booking/${bookingId}/complete`),
  deleteBooking: (bookingId) => apiClient.delete(`/admin/booking/${bookingId}`),
  exportBookings: () => apiClient.get("/admin/bookings/export", { responseType: "blob" }),
  getAuditLogs: () => apiClient.get("/admin/audit-logs"),
  getSystemLogs: (params = {}) => apiClient.get("/admin/logs", { params }),
  getActivityLogs: (params = {}) => apiClient.get("/admin/logs/activity", { params }),
  getSecurityLogs: (params = {}) => apiClient.get("/admin/logs/security", { params }),
  getCertificates: (params = {}) => apiClient.get("/admin/certificates", { params }),
  getAllFeedback: (page = 0, size = 10) => apiClient.get("/admin/feedback", { params: { page, size } }),
  respondToFeedback: (id, replyMessage) => apiClient.put(`/admin/feedback/${id}/reply`, { replyMessage }),
  getAllContacts: () => apiClient.get("/admin/contacts"),
  getContactAnalytics: () => apiClient.get("/contact/analytics"),
  respondToContact: (id, replyMessage) => apiClient.put(`/admin/contact/${id}/reply`, { replyMessage }),
  deleteContact: (id) => apiClient.delete(`/admin/contacts/${id}`),
  getAllCertificates: () => apiClient.get("/admin/certificates")
};

export const superAdminAPI = {
  createAdmin: (data) => apiClient.post("/superadmin/create-admin", data),
  getAdmins: () => apiClient.get("/admins"),
  createManagedAdmin: (data) => apiClient.post("/admins", data),
  updateAdmin: (adminId, data) => apiClient.put(`/admins/${adminId}`, data),
  deleteAdmin: (adminId) => apiClient.delete(`/admins/${adminId}`),
  updateUser: (userId, data) => apiClient.put(`/super-admin/users/${userId}`, data),
  deleteUser: (userId) => apiClient.delete(`/super-admin/users/${userId}`),
  updateCenter: (centerId, data) => apiClient.put(`/super-admin/centers/${centerId}`, data),
  deleteCenter: (centerId) => apiClient.delete(`/super-admin/centers/${centerId}`),
  updateDrive: (driveId, data) => apiClient.put(`/super-admin/drives/${driveId}`, data),
  deleteDrive: (driveId) => apiClient.delete(`/super-admin/drives/${driveId}`),
  getDriveSlots: (driveId) => apiClient.get(`/super-admin/drives/${driveId}/slots`),
  updateSlot: (slotId, data) => apiClient.put(`/super-admin/slots/${slotId}`, data),
  deleteSlot: (slotId) => apiClient.delete(`/super-admin/slots/${slotId}`)
};

export const feedbackAPI = {
  submitFeedback: (data) => apiClient.post("/feedback", data),
  getMyFeedback: () => apiClient.get("/feedback/my-feedback"),
  getFeedbackById: (id) => apiClient.get(`/feedback/${id}`)
};

export const contactAPI = {
  submitContact: (data) => apiClient.post("/contact", data),
  getMyInquiries: () => apiClient.get("/contact/my-inquiries"),
  getUserHistory: (userId) => apiClient.get(`/contact/user/${userId}`),
  getAllContacts: () => apiClient.get("/contact/all"),
  getContactById: (id) => apiClient.get(`/contact/${id}`),
  respondToContact: (id, response) => apiClient.patch(`/contact/${id}/respond`, { response }),
  deleteContact: (id) => apiClient.delete(`/contact/${id}`)
};

export const newsAPI = {
  getAllNews: (page = 0, size = 10) => apiClient.get("/public/news", {
    params: { page, size, _: Date.now() },
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    }
  }),
  getAdminNews: (page = 0, size = 100) => apiClient.get("/admin/news", { params: { page, size } }),
  getNewsById: (id) => apiClient.get(`/public/news/${id}`),
  createNews: (data) => apiClient.post("/admin/news", data, { headers: buildAuthHeaders() }),
  updateNews: (id, data) => apiClient.put(`/admin/news/${id}`, data, { headers: buildAuthHeaders() }),
  deleteNews: (id) => apiClient.delete(`/admin/news/${id}`, { headers: buildAuthHeaders() })
};

export const importAPI = {
  startImport: (type, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    return apiClient.post("/import", formData, {
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "multipart/form-data"
      },
      onUploadProgress
    });
  },
  getImport: (jobId) => apiClient.get(`/import/${jobId}`),
  downloadErrorReport: (jobId) => apiClient.get(`/import/errors/${jobId}`, {
    headers: buildAuthHeaders(),
    responseType: "blob"
  }),
  getProgressStreamUrl: (jobId) => `${API_BASE_URL}/import/progress/${jobId}`
};

export const certificateAPI = {
  getMyCertificates: () => apiClient.get("/certificates/my-certificates"),
  getCertificateById: (id) => apiClient.get(`/certificates/${id}`),
  verifyCertificate: (certNumber) => apiClient.get(`/certificates/verify/${certNumber}`),
  verifyCertificateById: (certificateId) => apiClient.get(`/certificate/verify/${certificateId}`),
  generateCertificate: (data) => apiClient.post("/certificates", data),
  getAllCertificates: () => apiClient.get("/certificates"),
  recordDownload: (certificateId, data) => apiClient.post(`/certificates/${certificateId}/downloads`, data),
  getDownloadHistory: () => apiClient.get("/certificates/download-history")
};

export const reviewAPI = {
  getCenterReviews: (centerId) => apiClient.get(`/reviews/center/${centerId}`),
  getCenterReviewsPaged: (centerId, page = 0, size = 10) => apiClient.get(`/reviews/center/${centerId}/paged`, { params: { page, size } }),
  getCenterRating: (centerId) => apiClient.get(`/reviews/center/${centerId}/rating`),
  submitReview: (data) => apiClient.post("/reviews", data),
  approveReview: (id) => apiClient.patch(`/reviews/${id}/approve`),
  deleteReview: (id) => apiClient.delete(`/reviews/${id}`),
  getAllReviews: () => apiClient.get("/reviews")
};

export const notificationAPI = {
  ...notificationEndpoints
};

export const healthAPI = {
  check: () => apiClient.get("/health"),
  ping: () => apiClient.get("/health/ping")
};

export { apiClient };
export default apiClient;
