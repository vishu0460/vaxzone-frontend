import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchDashboardStats } from "../../services/dashboardService";
import { apiClient } from "../../api/client";

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual("../../api/client");
  return {
    ...actual,
    apiClient: {
      get: vi.fn()
    }
  };
});

describe("dashboardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes dashboard stats from the API payload", async () => {
    apiClient.get.mockResolvedValue({
      data: {
        data: {
          centers: 102,
          activeDrives: 150,
          availableSlots: 11550
        }
      }
    });

    await expect(fetchDashboardStats()).resolves.toEqual({
      centers: 102,
      activeDrives: 150,
      availableSlots: 11550
    });
    expect(apiClient.get).toHaveBeenCalledWith("/dashboard/stats");
  });
});
