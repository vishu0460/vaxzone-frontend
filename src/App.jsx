import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import AppLoadingFallback from "./components/AppLoadingFallback";
import ChunkErrorBoundary from "./components/ChunkErrorBoundary";
import { ThemeProvider } from "./context/ThemeContext";
import { PublicCatalogProvider } from "./context/PublicCatalogContext";
import { isAuthenticated, getRole } from "./utils/auth";
import { openSiteExitFeedbackWindow } from "./utils/feedbackPrompt";
import { lazyWithRetry } from "./utils/lazyWithRetry";

const VaxZoneChatbot = lazy(lazyWithRetry(() => import("./components/chatbot/VaxZoneChatbot"), "chatbot"));

export default function App() {
  useEffect(() => {
    const handlePotentialSiteExit = () => {
      const role = isAuthenticated() ? getRole() : null;
      openSiteExitFeedbackWindow({
        role,
        pathname: window.location.pathname,
        returnTo: "/",
        subject: "website"
      });
    };

    window.addEventListener("beforeunload", handlePotentialSiteExit);
    return () => {
      window.removeEventListener("beforeunload", handlePotentialSiteExit);
    };
  }, []);

  return (
    <ThemeProvider>
      <PublicCatalogProvider>
        <div className="app-shell d-flex flex-column min-vh-100">
          <ScrollToTop />
          <Toaster
            position="top-right"
            gutter={12}
            toastOptions={{
              duration: 3500
            }}
          />
          <Navbar />
          <main className="app-main flex-grow-1">
            <AppRoutes />
          </main>
          <Footer />
          <ChunkErrorBoundary resetKey="chatbot" title="Ask VaxZone is unavailable" message="Refresh the page to reopen the assistant.">
            <Suspense fallback={<AppLoadingFallback variant="floating" />}>
              <VaxZoneChatbot />
            </Suspense>
          </ChunkErrorBoundary>
        </div>
      </PublicCatalogProvider>
    </ThemeProvider>
  );
}
