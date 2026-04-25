export const explainChatbotError = (error, fallback = "I couldn't complete that request right now.") => {
  const status = error?.response?.status;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      text: "You seem offline. I can still show your cached recent chat, but live actions are paused until the connection returns.",
      nextAction: "Retry when your internet connection is back."
    };
  }

  if (status === 401) {
    return {
      text: "Your login session looks expired.",
      nextAction: "Sign in again, then retry the action."
    };
  }

  if (status === 403) {
    return {
      text: "You do not have permission for that action.",
      nextAction: "Use an account with the required role or open the matching dashboard page."
    };
  }

  if (status === 404) {
    return {
      text: "I couldn't find matching data for that request.",
      nextAction: "Try a different city, date, booking, or certificate number."
    };
  }

  if (status === 400 || status === 422) {
    return {
      text: "Some details are missing or not valid yet.",
      nextAction: "Check the required fields and try again."
    };
  }

  if (status >= 500) {
    return {
      text: "The server is not responding properly right now.",
      nextAction: "Please retry in a moment or open the relevant page directly."
    };
  }

  return {
    text: fallback,
    nextAction: "Retry once, or open the related page for more details."
  };
};
