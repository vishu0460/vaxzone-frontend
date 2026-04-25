import React, { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import AppLoadingFallback from "../components/AppLoadingFallback";
import ChunkErrorBoundary from "../components/ChunkErrorBoundary";
import ProtectedRoute from "../components/ProtectedRoute";
import PageErrorBoundary from "../components/PageErrorBoundary";
import { lazyWithRetry } from "../utils/lazyWithRetry";

const HomePage = lazy(lazyWithRetry(() => import("../pages/HomePage"), "route-home"));
const DrivesPage = lazy(lazyWithRetry(() => import("../pages/DrivesPage"), "route-drives"));
const CentersPage = lazy(lazyWithRetry(() => import("../pages/CentersPage"), "route-centers"));
const AboutPage = lazy(lazyWithRetry(() => import("../pages/AboutPage"), "route-about"));
const ContactPage = lazy(lazyWithRetry(() => import("../pages/ContactPage"), "route-contact"));
const LoginPage = lazy(lazyWithRetry(() => import("../pages/LoginPage"), "route-login"));
const RegisterPage = lazy(lazyWithRetry(() => import("../pages/RegisterPage"), "route-register"));
const ForgotPasswordPage = lazy(lazyWithRetry(() => import("../pages/ForgotPasswordPage"), "route-forgot-password"));
const ResetPasswordPage = lazy(lazyWithRetry(() => import("../pages/ResetPasswordPage"), "route-reset-password"));
const AdminDashboardPage = lazy(lazyWithRetry(() => import("../pages/AdminDashboardPage"), "route-admin-dashboard"));
const AdminDriveSlotsPage = lazy(lazyWithRetry(() => import("../pages/AdminDriveSlotsPage"), "route-admin-drive-slots"));
const UserBookingsPage = lazy(lazyWithRetry(() => import("../pages/UserBookingsPage"), "route-user-bookings"));
const NotFoundPage = lazy(lazyWithRetry(() => import("../pages/NotFoundPage"), "route-not-found"));
const PrivacyPolicyPage = lazy(lazyWithRetry(() => import("../pages/PrivacyPolicyPage"), "route-privacy"));
const TermsConditionsPage = lazy(lazyWithRetry(() => import("../pages/TermsConditionsPage"), "route-terms"));
const CopyrightPage = lazy(lazyWithRetry(() => import("../pages/CopyrightPage"), "route-copyright"));
const ContactLegalPage = lazy(lazyWithRetry(() => import("../pages/ContactLegalPage"), "route-contact-legal"));
const ProfilePage = lazy(lazyWithRetry(() => import("../pages/ProfilePage"), "route-profile"));
const FeedbackPage = lazy(lazyWithRetry(() => import("../pages/FeedbackPage"), "route-feedback"));
const NewsPage = lazy(lazyWithRetry(() => import("../pages/NewsPage"), "route-news"));
const GuidePage = lazy(lazyWithRetry(() => import("../pages/GuidePage"), "route-guide"));
const CertificatePage = lazy(lazyWithRetry(() => import("../pages/CertificatePage"), "route-certificates"));
const CenterDetailPage = lazy(lazyWithRetry(() => import("../pages/CenterDetailPage"), "route-center-detail"));
const VerifyEmailPage = lazy(lazyWithRetry(() => import("../pages/VerifyEmailPage"), "route-verify-email"));
const CookiePolicyPage = lazy(lazyWithRetry(() => import("../pages/CookiePolicyPage"), "route-cookie-policy"));
const DisclaimerPage = lazy(lazyWithRetry(() => import("../pages/DisclaimerPage"), "route-disclaimer"));
const MyFeedbackPage = lazy(lazyWithRetry(() => import("../pages/MyFeedbackPage"), "route-my-feedback"));
const MyContactPage = lazy(lazyWithRetry(() => import("../pages/MyContactPage"), "route-my-contact"));
const VerifyCertificatePage = lazy(lazyWithRetry(() => import("../pages/VerifyCertificatePage"), "route-verify-certificate"));

export default function AppRoutes() {
  return (
    <ChunkErrorBoundary resetKey="app-routes" title="A page failed to load" message="Refresh the page or retry the route.">
      <Suspense fallback={<AppLoadingFallback title="Loading secure route" description="Fetching the next VaxZone workspace." />}>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/drives" element={<DrivesPage />} />
        <Route path="/centers" element={<CentersPage />} />
        <Route path="/centers/:id" element={<CenterDetailPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-certificate" element={<VerifyCertificatePage />} />
        <Route path="/verify-certificate/:certId" element={<VerifyCertificatePage />} />
        <Route path="/verify/certificate" element={<VerifyCertificatePage />} />
        <Route path="/verify/certificate/:certNumber" element={<VerifyCertificatePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />

        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-conditions" element={<TermsConditionsPage />} />
        <Route path="/copyright" element={<CopyrightPage />} />
        <Route path="/contact-legal" element={<ContactLegalPage />} />
        <Route path="/cookie-policy" element={<CookiePolicyPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />

        <Route
          path="/user/bookings"
          element={(
            <ProtectedRoute roles={["USER"]}>
              <UserBookingsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute roles={["USER", "ADMIN", "SUPER_ADMIN"]}>
              <ProfilePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/account"
          element={(
            <ProtectedRoute roles={["USER", "ADMIN", "SUPER_ADMIN"]}>
              <ProfilePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/certificates"
          element={(
            <ProtectedRoute roles={["USER"]}>
              <CertificatePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/my-feedback"
          element={(
            <ProtectedRoute roles={["USER"]}>
              <MyFeedbackPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/my-inquiries"
          element={(
            <ProtectedRoute roles={["USER"]}>
              <MyContactPage />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/admin/drives/:driveId/slots"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/drives/:driveId/slots">
                <AdminDriveSlotsPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/dashboard"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/dashboard">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/users"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/users">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/bookings"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/bookings">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/certificates"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/certificates">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/centers"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/centers">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/drives"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/drives">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/slots"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/slots">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/news"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/news">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/feedback"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/feedback">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/contacts"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/contacts">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/logs"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/logs">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/admins"
          element={(
            <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
              <PageErrorBoundary resetKey="/admin/admins">
                <AdminDashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          )}
        />

        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ChunkErrorBoundary>
  );
}
