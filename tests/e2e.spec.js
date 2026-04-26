import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.VITE_FRONTEND_URL || 'http://127.0.0.1:4173';
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8080/api';
const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL || '';
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD || '';
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';
const hasAdminCredentials = Boolean(E2E_ADMIN_EMAIL && E2E_ADMIN_PASSWORD);

const uniqueEmail = () => `testuser${Date.now()}${Math.floor(Math.random() * 10000)}@test.com`;
const provisionedUser = {
  email: E2E_USER_EMAIL,
  password: E2E_USER_PASSWORD || 'Test@123456',
};

async function loginAs(page, email, password, expectedUrlPattern) {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(expectedUrlPattern, { timeout: 15000 });
}

test.describe('Vaccination System E2E Tests', () => {
  test.beforeAll(async ({ request }) => {
    if (provisionedUser.email) {
      return;
    }

    provisionedUser.email = uniqueEmail();

    const response = await request.post(`${API_BASE_URL}/auth/register`, {
      data: {
        fullName: 'Playwright User',
        email: provisionedUser.email,
        phoneNumber: '9876543210',
        gender: 'Male',
        password: provisionedUser.password,
        dob: '2000-01-01',
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('1. User Registration Flow', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/register`);

    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', uniqueEmail());
    await page.fill('input[name="password"]', 'Test@123456');
    await page.fill('input[name="confirmPassword"]', 'Test@123456');
    await page.fill('input[name="phoneNumber"]', '9876543210');
    await page.selectOption('select[name="gender"]', 'Female');
    await page.fill('input[name="dob"]', '2000-01-01');
    await page.getByRole('checkbox', { name: /i agree to the/i }).check();
    await page.click('button[type="submit"]');
    await expect(page.getByText(/registration successful/i)).toBeVisible({ timeout: 15000 });
  });

  test('2. User Login Flow', async ({ page }) => {
    await loginAs(page, provisionedUser.email, provisionedUser.password, /\/user\/bookings/);
  });

  test('3. View Public Drives', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/drives`);
    await expect(page).toHaveURL(/\/drives/);
    await expect(page.getByRole('heading', { name: /Vaccination Drives/i })).toBeVisible();
  });

  test('4. View Public Centers', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/centers`);
    await expect(page).toHaveURL(/\/centers/);
    await expect(page.getByRole('heading', { name: /Vaccination Centers/i })).toBeVisible();
  });

  test('5. Login as Admin', async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin tests.');
    await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, /\/admin\/dashboard/);
  });

  test('6. Admin Dashboard Access', async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin tests.');
    await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, /\/admin\/dashboard/);
    await page.goto(`${FRONTEND_URL}/admin/dashboard`);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible();
  });

  test('7. Unauthorized Access to Admin', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('8. Booking Flow', async ({ page }) => {
    await loginAs(page, provisionedUser.email, provisionedUser.password, /\/user\/bookings/);
    await page.goto(`${FRONTEND_URL}/drives`);
    await expect(page).toHaveURL(/\/drives/);
    await expect(page.getByRole('heading', { name: /Vaccination Drives/i })).toBeVisible();
  });

  test('9. User Bookings Page', async ({ page }) => {
    await loginAs(page, provisionedUser.email, provisionedUser.password, /\/user\/bookings/);
    await page.goto(`${FRONTEND_URL}/user/bookings`);
    await expect(page).toHaveURL(/\/user\/bookings/);
    await expect(page.getByRole('heading', { name: /My Appointments/i })).toBeVisible();
  });

  test('10. Logout Flow', async ({ page }) => {
    await loginAs(page, provisionedUser.email, provisionedUser.password, /\/user\/bookings/);
    await page.getByRole('button', { name: /My Account/i }).click();
    await page.getByRole('button', { name: /Logout/i }).click();
    await expect(page).toHaveURL(`${FRONTEND_URL}/`);
  });
});
