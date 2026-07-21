import { spawn } from 'node:child_process';

const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: false });
const server = spawn('node', ['server/index.js'], { stdio: 'inherit', shell: false });

const shutdown = () => {
  vite.kill('SIGTERM');
  server.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
