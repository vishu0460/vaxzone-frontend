import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { API_BASE_URL, apiClient, authAPI, publicAPI, userAPI, adminAPI } from '../../api/client';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Endpoints', () => {
    it('should have authAPI with login method', () => {
      expect(authAPI).toBeDefined();
      expect(typeof authAPI.login).toBe('function');
      expect(typeof authAPI.register).toBe('function');
      expect(typeof authAPI.refresh).toBe('function');
    });

    it('should have publicAPI with getDrives method', () => {
      expect(publicAPI).toBeDefined();
      expect(typeof publicAPI.getDrives).toBe('function');
      expect(typeof publicAPI.getCenters).toBe('function');
      expect(typeof publicAPI.getSummary).toBe('function');
    });

    it('should have userAPI with getProfile method', () => {
      expect(userAPI).toBeDefined();
      expect(typeof userAPI.getProfile).toBe('function');
      expect(typeof userAPI.getBookings).toBe('function');
      expect(typeof userAPI.bookSlot).toBe('function');
    });

    it('should have adminAPI with getDashboardStats method', () => {
      expect(adminAPI).toBeDefined();
      expect(typeof adminAPI.getDashboardStats).toBe('function');
      expect(typeof adminAPI.getAllBookings).toBe('function');
      expect(typeof adminAPI.createCenter).toBe('function');
    });
  });

  describe('apiClient Configuration', () => {
    it('should have baseURL configured', () => {
      expect(apiClient.defaults.baseURL).toBeDefined();
      expect(apiClient.defaults.baseURL).toBe(API_BASE_URL);
      expect(apiClient.defaults.baseURL).toContain('/api');
    });

    it('should have request interceptor', () => {
      expect(apiClient.interceptors.request.handlers.length).toBeGreaterThan(0);
    });

    it('should have response interceptor', () => {
      expect(apiClient.interceptors.response.handlers.length).toBeGreaterThan(0);
    });
  });
});
