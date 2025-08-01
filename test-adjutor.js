const axios = require('axios');

async function testAdjutorAPI() {
  const baseURL = 'https://adjutor.lendsqr.com/v2';
  const endpoint = '/verification/karma';
  const testIdentities = [
    { identity_number: "22334455667", identity_type: "BVN" },
    { identity_number: "08028181984", identity_type: "PHONE_NUMBER" },
    { identity_number: "muhammedfayemi123@gmail.com", identity_type: "EMAIL" }
  ];
  const apiKey = "api_key";

  for (const identity of testIdentities) {
    const url = `${baseURL}${endpoint}/${encodeURIComponent(identity.identity_number)}`;
    try {
      console.log(`Testing: GET ${url}?identity_type=${identity.identity_type}`);
      const response = await axios.get(url, {
        params: { identity_type: identity.identity_type },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      console.log(`✅ SUCCESS: ${url}`);
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, response.data);
      console.log('---\n');
    } catch (error) {
      console.log(`❌ FAILED: ${url}`);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Error:`, error.response.data);
      } else if (error.request) {
        console.log('No response received - connection issue');
      } else {
        console.log('Error:', error.message);
      }
      console.log('---\n');
    }
  }
}

testAdjutorAPI().catch(console.error);