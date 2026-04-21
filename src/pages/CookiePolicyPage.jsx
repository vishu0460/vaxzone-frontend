import React from "react";
import { Helmet } from "react-helmet-async";

export default function CookiePolicyPage() {
  return (
    <>
      <Helmet>
        <title>Cookie Policy - VaxZone</title>
        <meta name="description" content="VaxZone Cookie Policy - Learn how we use cookies to improve your experience." />
      </Helmet>
      
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item"><a href="/">Home</a></li>
                <li className="breadcrumb-item active" aria-current="page">Cookie Policy</li>
              </ol>
            </nav>
            
            <h1 className="mb-4">Cookie Policy</h1>
            
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <p className="text-muted mb-4">
                  <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                
                <h4 className="mt-4">1. What Are Cookies?</h4>
                <p className="text-muted">
                  Cookies are small text files placed on your computer or mobile device when you visit a website.
                </p>
                
                <h4 className="mt-4">2. How We Use Cookies</h4>
                <p className="text-muted">
                  VaxZone uses cookies to keep you logged in, remember your preferences, analyze performance, and improve our services.
                </p>
                
                <h4 className="mt-4">3. Managing Cookies</h4>
                <p className="text-muted">
                  Most web browsers allow you to control cookies through their settings.
                </p>
                
                <h4 className="mt-4">4. Contact Us</h4>
                <p className="text-muted">
                  If you have any questions about our Cookie Policy, please contact us at{" "}
                  <a href="mailto:vaxzone.vaccine@gmail.com">vaxzone.vaccine@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
