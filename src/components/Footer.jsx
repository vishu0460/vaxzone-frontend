import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { FaEnvelope, FaFacebookF, FaInstagram, FaLinkedinIn, FaMapMarkerAlt, FaPhone } from "react-icons/fa";
import { getRole, isAuthenticated } from "../utils/auth";
import { footerLegalLinks, getFooterContent } from "../utils/navigationLinks";

const socialLinks = [
  { href: "https://www.linkedin.com", label: "LinkedIn", icon: <FaLinkedinIn /> },
  { href: "https://www.instagram.com", label: "Instagram", icon: <FaInstagram /> },
  { href: "https://www.facebook.com", label: "Facebook", icon: <FaFacebookF /> }
];

const getAuthFooterState = () => ({
  loggedIn: isAuthenticated(),
  role: String(getRole() || "").toUpperCase()
});

export default function Footer() {
  const location = useLocation();
  const [authState, setAuthState] = useState(getAuthFooterState);
  const hideFooterOnAuthPage = location.pathname === "/login" || location.pathname === "/register";

  useEffect(() => {
    const syncAuthState = () => setAuthState(getAuthFooterState());

    syncAuthState();
    window.addEventListener("vaxzone:auth-changed", syncAuthState);
    window.addEventListener("storage", syncAuthState);
    return () => {
      window.removeEventListener("vaxzone:auth-changed", syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, [location.pathname]);

  const footerContent = useMemo(
    () => getFooterContent(authState.role, authState.loggedIn),
    [authState.loggedIn, authState.role]
  );
  const seenFooterDestinations = new Set();
  const getUniqueFooterLinks = (items) => items.filter((item) => {
    if (seenFooterDestinations.has(item.to)) {
      return false;
    }
    seenFooterDestinations.add(item.to);
    return true;
  });
  const quickLinks = getUniqueFooterLinks(footerContent.quickLinks);
  const serviceLinks = getUniqueFooterLinks(footerContent.serviceLinks);
  const supportLinks = getUniqueFooterLinks(footerContent.supportLinks);
  const legalLinks = getUniqueFooterLinks(footerLegalLinks);

  if (hideFooterOnAuthPage) {
    return null;
  }

  return (
    <footer className="site-footer">
      <Container className="site-footer__container">
        <div className="site-footer__top">
          <Row className="g-4 g-xl-5 site-footer__top-grid">
            <Col xl={3} lg={4} md={6} className="site-footer__section site-footer__section--brand">
              <div className="site-footer__brand">
                <span className="site-footer__eyebrow">{footerContent.eyebrow}</span>
                <h5 className="site-footer__title">VaxZone</h5>
                <p className="site-footer__copy">{footerContent.copy}</p>
              </div>
            </Col>

            <Col xl={2} lg={4} md={6} className="site-footer__section">
              <h6 className="site-footer__heading">{footerContent.quickHeading}</h6>
              <ul className="site-footer__list list-unstyled">
                {quickLinks.map((item) => (
                  <li key={`${item.to}-${item.label}`}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </Col>

            <Col xl={2} lg={4} md={6} className="site-footer__section">
              <h6 className="site-footer__heading">{footerContent.serviceHeading}</h6>
              <ul className="site-footer__list list-unstyled">
                {serviceLinks.map((item) => (
                  <li key={`${item.to}-${item.label}`}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </Col>

            <Col xl={2} lg={4} md={6} className="site-footer__section">
              <h6 className="site-footer__heading">{footerContent.supportHeading}</h6>
              <ul className="site-footer__list list-unstyled">
                {supportLinks.map((item) => (
                  <li key={`${item.to}-${item.label}`}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </Col>

            <Col xl={3} lg={8} md={12} className="site-footer__section site-footer__section--contact">
              <h6 className="site-footer__heading">Contact & Social</h6>
              <ul className="site-footer__contact list-unstyled">
                <li><FaPhone /> <a href="tel:+919631376436">+91 96313 76436</a></li>
                <li><FaEnvelope /> <a href="mailto:vaxzone.vaccine@gmail.com">vaxzone.vaccine@gmail.com</a></li>
                <li><FaMapMarkerAlt /> <span>India</span></li>
              </ul>
              <div className="site-footer__social">
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    className="site-footer__social-link"
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            </Col>
          </Row>
        </div>

        <div className="site-footer__bottom">
          <p className="site-footer__copyright">{"\u00A9"} 2026 VaxZone. All rights reserved.</p>
          <div className="site-footer__legal">
            {legalLinks.map((item) => (
              <Link key={`${item.to}-${item.label}`} to={item.to}>{item.label}</Link>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
