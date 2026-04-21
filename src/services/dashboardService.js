import { apiClient, unwrapApiData } from "../api/client";

export const fetchDashboardStats = async () => {
  const response = await apiClient.get("/dashboard/stats");
  const payload = unwrapApiData(response) || {};

  return {
    centers: Number(payload.centers || 0),
    activeDrives: Number(payload.activeDrives || 0),
    availableSlots: Number(payload.availableSlots || 0)
  };
};

export default {
  fetchDashboardStats
};
