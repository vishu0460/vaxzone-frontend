import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import net from 'net';
import path from 'path';

const DEFAULT_BACKEND_PORTS = [8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089];

const getBackendPortCandidates = () => {
  const rawValue = process.env.VITE_API_PORT_CANDIDATES;
  if (!rawValue) {
    return [...DEFAULT_BACKEND_PORTS].sort((a, b) => a - b);
  }

  const ports = rawValue
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  const candidates = ports.length > 0 ? ports : DEFAULT_BACKEND_PORTS;
  return [...candidates].sort((a, b) => a - b);
};

const isPortOpen = (port) =>
  new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(400);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });

const resolveDevProxyTarget = async () => {
  for (const port of getBackendPortCandidates()) {
    if (await isPortOpen(port)) {
      return `http://localhost:${port}`;
    }
  }

  return 'http://localhost:8080';
};

export default defineConfig(async () => {
  const proxyTarget = await resolveDevProxyTarget();

  return {
    plugins: [react()],
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5174,
      strictPort: false,
      allowedHosts: ['all'],
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
            });
          }
        }
      }
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
    }
  };
});
