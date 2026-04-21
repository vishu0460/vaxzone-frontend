import React from "react";
import { Helmet } from "react-helmet-async";
import { resolveCanonicalUrl } from "../config/runtime";

const CopyrightPage = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Helmet>
        <title>Copyright Policy | VaxZone</title>
        <meta name="description" content="Copyright Policy for VaxZone - Information about intellectual property." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={resolveCanonicalUrl("/copyright")} />
      </Helmet>

      <div className="copyright-page">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="card shadow-sm border-0">
                <div className="card-body p-5">
                  <h1 className="display-5 fw-bold text-primary mb-4">Copyright Policy</h1>
                  <p className="text-muted mb-4">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <hr className="my-4" />

                  <section className="mb-5">
                    <h2 className="h4 fw-bold mb-3">1. Copyright Ownership</h2>
                    <p className="text-muted">
                      All content, features, and functionality of VaxZone are owned by us and are protected by copyright, trademark, and other intellectual property laws.
                    </p>
                  </section>

                  <section className="mb-5">
                    <h2 className="h4 fw-bold mb-3">2. Reporting Copyright Infringement</h2>
                    <p className="text-muted">
                      If you believe your copyrighted work has been infringed, please contact us.
                    </p>
                    <div className="bg-light p-4 rounded mt-3">
                      <p className="mb-1"><strong>Copyright Agent</strong></p>
                      <p className="mb-1">Email: vaxzone.vaccine@gmail.com</p>
                    </div>
                  </section>

                  <hr className="my-4" />

                  <div className="text-center mt-5">
                    <p className="text-muted mb-2">
                      © {currentYear} VaxZone. All rights reserved.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CopyrightPage;
