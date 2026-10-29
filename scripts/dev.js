/**
 * Knightly Unified Development Runner
 *
 * Spawns both the Express backend server and the Expo React Native dev server
 * concurrently from a single terminal with interactive keyboard pass-through.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('⚔️  Starting Knightly Backend Server & Expo Client...\n');

// 1. Start Express Backend (:3000)
const serverProcess = spawn('node', ['server/server.js'], {
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: true,
  cwd: path.resolve(__dirname, '..'),
});

serverProcess.on('error', (err) => {
  console.error('❌ [Backend Error]:', err.message);
});

serverProcess.on('exit', (code, signal) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ [Backend Exited] Exit code: ${code}, signal: ${signal}`);
  }
});

// 2. Start Expo Development Server
const clientProcess = spawn('npm', ['--prefix', 'client', 'start'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..'),
});

clientProcess.on('error', (err) => {
  console.error('❌ [Expo Error]:', err.message);
});

function cleanup() {
  try {
    serverProcess.kill();
  } catch {}
  try {
    clientProcess.kill();
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
