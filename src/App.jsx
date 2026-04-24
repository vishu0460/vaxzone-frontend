import React from "react";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import VaxZoneChatbot from "./components/chatbot/VaxZoneChatbot";
import { ThemeProvider } from "./context/ThemeContext";
import { PublicCatalogProvider } from "./context/PublicCatalogContext";

export default function App() {
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
          <VaxZoneChatbot />
        </div>
      </PublicCatalogProvider>
    </ThemeProvider>
  );
}
