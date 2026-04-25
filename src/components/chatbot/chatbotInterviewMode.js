const FAQ = {
  react: "React helps VaxZone ship a responsive single-page frontend with reusable components, route-aware UI, and fast updates for chatbot, booking, and admin dashboards.",
  "spring boot": "Spring Boot gives VaxZone structured REST APIs, security middleware, validation, and scalable controller-service layers for bookings, certificates, and admin operations.",
  jwt: "JWT is used so authenticated requests can stay stateless across frontend and backend while preserving role-based access for user, admin, and super admin flows.",
  mysql: "MySQL fits the project because vaccination, booking, certificate, contact, and audit data are relational and need reliable structured queries."
};

export const getInterviewAnswer = (normalizedInput = "") => {
  const match = Object.keys(FAQ).find((key) => normalizedInput.includes(key));
  return match ? FAQ[match] : "";
};

export const getArchitectureAnswer = () =>
  "VaxZone uses a React frontend, Spring Boot backend, JWT-based auth, role-aware routes, modular chatbot actions, and reusable API-driven cards so the project stays secure, scalable, and demo-friendly.";
