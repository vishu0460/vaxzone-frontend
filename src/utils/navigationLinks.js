const publicQuickLinks = [
  { to: "/", label: "Home" },
  { to: "/drives", label: "Vaccination Drives" },
  { to: "/centers", label: "Vaccination Centers" },
  { to: "/news", label: "Health News" },
  { to: "/about", label: "About Us" }
];

const publicServiceLinks = [
  { to: "/login", label: "Login" },
  { to: "/register", label: "Create Account" },
  { to: "/verify/certificate", label: "Verify Certificate" },
  { to: "/feedback", label: "Share Feedback" }
];

const userQuickLinks = [
  { to: "/user/bookings", label: "Dashboard" },
  { to: "/drives", label: "Browse Drives" },
  { to: "/centers", label: "Find Centers" },
  { to: "/news", label: "Health News" }
];

const userServiceLinks = [
  { to: "/user/bookings", label: "Book a Slot" },
  { to: "/certificates", label: "My Certificates" },
  { to: "/profile", label: "Update Profile" },
  { to: "/my-feedback", label: "My Feedback" },
  { to: "/my-inquiries", label: "My Inquiries" }
];

const adminQuickLinks = [
  { to: "/admin/bookings", label: "Manage Bookings" },
  { to: "/admin/centers", label: "Manage Centers" },
  { to: "/admin/drives", label: "Manage Drives" },
  { to: "/admin/slots", label: "Manage Slots" }
];

const adminServiceLinks = [
  { to: "/admin/certificates", label: "Certificates" },
  { to: "/admin/news", label: "Manage News" },
  { to: "/admin/feedback", label: "User Feedback" },
  { to: "/admin/contacts", label: "User Inquiries" },
  { to: "/profile", label: "My Profile" }
];

const superAdminQuickLinks = [
  { to: "/admin/dashboard", label: "Admin Dashboard" },
  { to: "/admin/users", label: "Manage Users" },
  { to: "/admin/admins", label: "Manage Admins" },
  { to: "/admin/logs", label: "System Logs" }
];

const superAdminServiceLinks = [
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/centers", label: "Centers" },
  { to: "/admin/drives", label: "Drives" },
  { to: "/admin/slots", label: "Slots" },
  { to: "/admin/certificates", label: "Certificates" }
];

const publicSupportLinks = [
  { to: "/about", label: "About" },
  { to: "/feedback", label: "Feedback" },
  { to: "/contact", label: "Contact Support" }
];

const userSupportLinks = [
  { to: "/my-inquiries", label: "Support History" },
  { to: "/verify/certificate", label: "Verify Certificate" },
  { to: "/about", label: "About" },
  { to: "/feedback", label: "Feedback" },
  { to: "/contact", label: "Contact Support" }
];

const adminSupportLinks = [
  { to: "/admin/contacts", label: "Contact Requests" },
  { to: "/admin/feedback", label: "Feedback Queue" },
  { to: "/admin/logs", label: "Audit Logs" },
  { to: "/about", label: "About" },
  { to: "/feedback", label: "Feedback" },
  { to: "/contact", label: "Contact Support" }
];

export const footerLegalLinks = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms-conditions", label: "Terms" },
  { to: "/contact", label: "Contact" }
];

export const getFooterContent = (role, loggedIn) => {
  if (!loggedIn) {
    return {
      eyebrow: "Healthcare Platform",
      copy: "Book appointments, discover trusted vaccination centers, and verify vaccination records through one secure healthcare experience.",
      quickHeading: "Quick Links",
      quickLinks: publicQuickLinks,
      serviceHeading: "Get Started",
      serviceLinks: publicServiceLinks,
      supportHeading: "Support",
      supportLinks: publicSupportLinks
    };
  }

  if (role === "SUPER_ADMIN") {
    return {
      eyebrow: "Super Admin Console",
      copy: "Monitor platform activity, manage teams, audit records, and keep vaccination operations moving from the admin workspace.",
      quickHeading: "Control Room",
      quickLinks: superAdminQuickLinks,
      serviceHeading: "Operations",
      serviceLinks: superAdminServiceLinks,
      supportHeading: "Review Queues",
      supportLinks: adminSupportLinks
    };
  }

  if (role === "ADMIN") {
    return {
      eyebrow: "Admin Workspace",
      copy: "Manage bookings, vaccination centers, drives, slot availability, certificates, announcements, and patient support requests.",
      quickHeading: "Manage",
      quickLinks: adminQuickLinks,
      serviceHeading: "Admin Tools",
      serviceLinks: adminServiceLinks,
      supportHeading: "Support Desk",
      supportLinks: adminSupportLinks
    };
  }

  return {
    eyebrow: "Patient Account",
    copy: "Book appointments, track your vaccination status, review notifications, update your profile, and download certificates when ready.",
    quickHeading: "My Care",
    quickLinks: userQuickLinks,
    serviceHeading: "Services",
    serviceLinks: userServiceLinks,
    supportHeading: "Help & Records",
    supportLinks: userSupportLinks
  };
};
