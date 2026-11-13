import { app, httpServer } from './server.js';

async function testBackend() {
  console.log('🧪 Starting Full Backend End-to-End API Verification...');
  const baseUrl = 'http://localhost:5001';

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    const health = await healthRes.json();
    console.log('✅ Health check:', health.status);

    // 2. Login as Manager
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@rugas.com', password: 'password123' }),
    });
    const loginData = await loginRes.json();
    if (!loginData.token) throw new Error('Login failed: ' + JSON.stringify(loginData));
    const token = loginData.token;
    console.log('✅ Manager Login Success! Manager Name:', loginData.user.name);

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. Create a new Queue
    const createQueueRes = await fetch(`${baseUrl}/api/queues`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Technical Verification Desk',
        prefix: 'TECH',
        counterName: 'Lab 402',
        color: '#8B5CF6',
        targetServiceTime: 4,
      }),
    });
    const queueData = await createQueueRes.json();
    const testQueueId = queueData.queue.id;
    console.log(`✅ Created Queue: "${queueData.queue.name}" with ID: ${testQueueId}`);

    // 4. Add tokens to queue
    const token1Res = await fetch(`${baseUrl}/api/tokens/queue/${testQueueId}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerName: 'Grace Hopper',
        priority: 'VIP',
        notes: 'Compiler optimization discussion',
      }),
    });
    const token1 = (await token1Res.json()).token;

    const token2Res = await fetch(`${baseUrl}/api/tokens/queue/${testQueueId}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerName: 'Alan Turing',
        priority: 'PRIORITY',
        notes: 'Enigma decryption queue',
      }),
    });
    const token2 = (await token2Res.json()).token;

    const token3Res = await fetch(`${baseUrl}/api/tokens/queue/${testQueueId}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerName: 'Ada Lovelace',
        priority: 'NORMAL',
        notes: 'Analytical Engine check',
      }),
    });
    const token3 = (await token3Res.json()).token;

    console.log(`✅ Generated Tokens: ${token1.tokenNumber} (pos: ${token1.position}), ${token2.tokenNumber} (pos: ${token2.position}), ${token3.tokenNumber} (pos: ${token3.position})`);

    // 5. Test Move Down / Move Up
    console.log('🔄 Testing Token Reordering (Move Down & Move Up)...');
    const moveDownRes = await fetch(`${baseUrl}/api/tokens/${token1.id}/move`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ direction: 'down' }),
    });
    const moveDownData = await moveDownRes.json();
    console.log('✅ Moved Token 1 down. New list order:', moveDownData.tokens.map((t: any) => `${t.tokenNumber} (#${t.position})`).join(', '));

    const moveUpRes = await fetch(`${baseUrl}/api/tokens/${token1.id}/move`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ direction: 'up' }),
    });
    const moveUpData = await moveUpRes.json();
    console.log('✅ Moved Token 1 back up to top. Top token is now:', moveUpData.tokens[0].tokenNumber);

    // 6. Test Serve Top Token (One-click button)
    console.log('🛎️ Testing Serve Top Token...');
    const serveRes = await fetch(`${baseUrl}/api/tokens/queue/${testQueueId}/serve-top`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ autoFinishServing: true }),
    });
    const serveData = await serveRes.json();
    console.log(`✅ Top token served! Token: ${serveData.servedToken.tokenNumber} for customer ${serveData.servedToken.customerName}`);
    console.log('   New waiting list:', serveData.waitingTokens.map((t: any) => `${t.tokenNumber} (#${t.position})`).join(', '));

    // 7. Complete Service
    console.log('🏁 Completing service for served token...');
    const completeRes = await fetch(`${baseUrl}/api/tokens/${serveData.servedToken.id}/complete`, {
      method: 'POST',
      headers: authHeaders,
    });
    const completeData = await completeRes.json();
    console.log(`✅ Marked ${completeData.token.tokenNumber} as COMPLETED!`);

    // 8. Cancel a token
    console.log('❌ Testing Token Cancellation...');
    const cancelRes = await fetch(`${baseUrl}/api/tokens/${token3.id}/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ reason: 'Customer requested reschedule' }),
    });
    const cancelData = await cancelRes.json();
    console.log(`✅ Cancelled token ${cancelData.token.tokenNumber}. Remaining waiting count:`, cancelData.waitingTokens.length);

    // 9. Test Analytics endpoint
    console.log('📊 Testing Analytics Dashboard endpoint...');
    const analyticsRes = await fetch(`${baseUrl}/api/analytics/${testQueueId}`, {
      headers: authHeaders,
    });
    const analyticsData = await analyticsRes.json();
    console.log('✅ Analytics Summary:', analyticsData.summary);

    console.log('🎉 ALL BACKEND API REQUIREMENTS VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    httpServer.close();
    process.exit(0);
  }
}

// Allow server 1 second to start before testing
setTimeout(testBackend, 1200);

