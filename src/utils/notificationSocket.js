import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { API_BASE_URL } from "../api/client";
import { getAccessToken } from "./auth";

let activeClient = null;

const resolveSocketUrl = () => {
  if (typeof API_BASE_URL === "string" && API_BASE_URL.trim()) {
    const normalizedApiBaseUrl = API_BASE_URL.replace(/\/+$/, "");
    if (normalizedApiBaseUrl.startsWith("http://") || normalizedApiBaseUrl.startsWith("https://")) {
      return normalizedApiBaseUrl.replace(/\/api$/, "") + "/ws";
    }
    return `${normalizedApiBaseUrl}/ws`;
  }

  return `${window.location.origin}/api/ws`;
};

export function connectNotificationSocket({ onNotification, onUnreadCount, onConnectError } = {}) {
  const token = getAccessToken();
  if (!token) {
    return () => {};
  }

  if (activeClient) {
    try {
      activeClient.deactivate();
    } catch {
      // Best effort cleanup before opening a new live connection.
    }
    activeClient = null;
  }

  const client = new Client({
    webSocketFactory: () => new SockJS(resolveSocketUrl()),
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },
    debug: () => {},
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe("/user/queue/notifications", (message) => {
        if (!message.body) return;
        try {
          onNotification?.(JSON.parse(message.body));
        } catch {
          // ignore malformed payload
        }
      });

      client.subscribe("/user/queue/notifications/unread", (message) => {
        if (!message.body) return;
        try {
          onUnreadCount?.(JSON.parse(message.body));
        } catch {
          // ignore malformed payload
        }
      });
    },
    onStompError: (frame) => {
      onConnectError?.(frame);
    },
    onWebSocketError: (event) => {
      onConnectError?.(event);
    }
  });

  client.activate();
  activeClient = client;

  return () => {
    if (activeClient === client) {
      activeClient = null;
    }
    client.deactivate();
  };
}
