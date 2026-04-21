import React from "react";
import { Helmet } from "react-helmet-async";

export default function DisclaimerPage() {
  return (
    <>
      <Helmet>
        <title>Disclaimer - VaxZone</title>
        <meta name="description" content="VaxZone Disclaimer - Important information about our service." />
      </Helmet>
      
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item"><a href="/">Home</a></li>
                <li className="breadcrumb-item active" aria-current="page">Disclaimer</li>
              </ol>
            </nav>
            
            <h1 className="mb-4">Disclaimer</h1>
            
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <p className="text-muted mb-4">
                  <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                
                <h4 className="mt-4">1. General Information</h4>
                <p className="text-muted">
                  The information provided on VaxZone is for general informational purposes only. 
                  While we strive to keep the information accurate and up-to-date, we make no representations 
                  or warranties about the completeness, accuracy, reliability, suitability, or availability.
                </p>
                
                <h4 className="mt-4">2. Not Medical Advice</h4>
                <p className="text-muted">
                  The content provided on this website is for informational purposes only and does NOT constitute 
                  medical advice. Always seek the advice of your physician or qualified health provider.
                </p>
                
                <h4 className="mt-4">3. Contact Information</h4>
                <p className="text-muted">
                  If you have any questions about this Disclaimer, please contact us at{" "}
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
