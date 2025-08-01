// test-api.js - Run this to test your API configuration
// Run with: node test-api.js

const https = require('https');

const options = {
  hostname: 'adjutor.lendsqr.com',
  port: 443,
  path: '/v2/verification/karma',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_KGsBUQN3xiWyBvFMRVsvdVqFVV2eA2Y6wv6CRwAE',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Lendsqr-Wallet-Service-Test/1.0'
  }
};

const testData = JSON.stringify({
  identity_number: "22459517707", // Your test BVN
  identity_type: "BVN"
});

console.log('Testing Adjutor API...');
console.log('URL:', `https://${options.hostname}${options.path}`);
console.log('Method:', options.method);
console.log('Headers:', options.headers);
console.log('Data:', testData);
console.log('\n--- Response ---');

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Status Message:', res.statusMessage);
  console.log('Headers:', res.headers);
  console.log('\nResponse Body:');
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error.message);
  console.error('Error Code:', error.code);
});

req.on('timeout', () => {
  console.error('Request timed out');
  req.destroy();
});

req.setTimeout(10000); // 10 second timeout
req.write(testData);
req.end();