#!/usr/bin/env node

/**
 * Simple test script to verify vite-app setup for testing
 */

const WebSocket = require('ws');

console.log('🧪 Testing Vite App + Python API Integration...\n');

// Test 1: Check if Python API is running
console.log('1. Checking Python API health...');
fetch('http://localhost:8080/health')
  .then(res => res.json())
  .then(data => {
    console.log('✅ Python API is running:', data.status);
  })
  .catch(err => {
    console.log('❌ Python API not running. Start it with:');
    console.log('   cd ../python-api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8080');
    process.exit(1);
  });

// Test 2: Test WebSocket connection
setTimeout(() => {
  console.log('\n2. Testing WebSocket connection...');

  const ws = new WebSocket('ws://localhost:8080/ws?session_id=test&user_id=test_user');

  ws.on('open', () => {
    console.log('✅ WebSocket connected successfully');
    ws.close();
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === 'connected') {
      console.log('✅ Received connection confirmation');
    }
  });

  ws.on('error', (error) => {
    console.log('❌ WebSocket connection failed:', error.message);
  });

  ws.on('close', () => {
    console.log('✅ WebSocket test completed');
    console.log('\n🎉 Setup verification complete!');
    console.log('\nNext steps:');
    console.log('1. Start vite-app: npm run dev');
    console.log('2. Open browser to http://localhost:5173');
    console.log('3. Try recording and see transcription + translation!');
  });
}, 1000);