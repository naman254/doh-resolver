import axios from 'axios';

const SERVER_URL = 'http://localhost:3001/dns-query';
const CONCURRENT_REQUESTS = 50; // Adjust based on how hard you want to hit it
const TOTAL_ROUNDS = 5;

// Mix of domains to test different logic paths
const testDomains = [
  { name: 'google.com', type: 'A' },       // Standard
  { name: 'facebook.com', type: 'AAAA' },   // IPv6
  { name: 'doubleclick.net', type: 'A' },   // BLOCKED
  { name: 'ads.google.com', type: 'A' },    // BLOCKED
  { name: 'github.com', type: 'A' },       // Standard
];

async function runStressTest() {
  console.log(`🔥 Starting Stress Test: ${CONCURRENT_REQUESTS} concurrent requests...`);
  const overallStart = Date.now();

  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    console.log(`\n📦 Round ${round}/${TOTAL_ROUNDS}`);
    
    const requests = Array.from({ length: CONCURRENT_REQUESTS }).map((_, i) => {
      const target = testDomains[i % testDomains.length]!;
      return axios.get(SERVER_URL, {
        params: { name: target.name, type: target.type },
        timeout: 5000
      }).catch(e => ({ status: 'error', message: e.message }));
    });

    const start = Date.now();
    await Promise.all(requests);
    const end = Date.now();

    console.log(`✅ Round complete in ${end - start}ms`);
  }

  console.log(`\n🏁 All rounds finished in ${Date.now() - overallStart}ms`);
}

runStressTest();