import axios from 'axios';

const SERVER_URL = 'http://localhost:3001/dns-query';
const CONCURRENT_REQUESTS = 50;
const TOTAL_ROUNDS = 5;

const testDomains = [
  { name: 'google.com', type: 'A' },
  { name: 'facebook.com', type: 'AAAA' },
  { name: 'doubleclick.net', type: 'A' },
  { name: 'ads.google.com', type: 'A' },
  { name: 'github.com', type: 'A' },
];

async function runStressTest() {
  console.log(`🔥 Stress Test: ${CONCURRENT_REQUESTS} concurrent x ${TOTAL_ROUNDS} rounds\n`);

  const allLatencies: number[] = [];
  let totalRequests = 0;
  let totalErrors = 0;
  const overallStart = Date.now();

  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    console.log(`📦 Round ${round}/${TOTAL_ROUNDS}`);

    const requests = Array.from({ length: CONCURRENT_REQUESTS }).map((_, i) => {
      const target = testDomains[i % testDomains.length]!;
      const start = Date.now();
      return axios
        .get(SERVER_URL, {
          params: { name: target.name, type: target.type },
          timeout: 5000,
        })
        .then(() => ({ latency: Date.now() - start, error: false }))
        .catch(() => ({ latency: Date.now() - start, error: true }));
    });

    const results = await Promise.all(requests);
    const roundLatencies = results.map((r) => r.latency);
    const roundErrors = results.filter((r) => r.error).length;

    allLatencies.push(...roundLatencies);
    totalRequests += CONCURRENT_REQUESTS;
    totalErrors += roundErrors;

    const roundMin = Math.min(...roundLatencies);
    const roundMax = Math.max(...roundLatencies);
    const roundAvg = Math.round(roundLatencies.reduce((a, b) => a + b, 0) / roundLatencies.length);

    console.log(`  Min: ${roundMin}ms | Avg: ${roundAvg}ms | Max: ${roundMax}ms | Errors: ${roundErrors}`);
  }

  const totalTime = (Date.now() - overallStart) / 1000;

  // Sort for percentiles
  allLatencies.sort((a, b) => a - b);
  const p50 = allLatencies[Math.floor(allLatencies.length * 0.5)]!;
  const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)]!;
  const p99 = allLatencies[Math.floor(allLatencies.length * 0.99)]!;
  const avg = Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length);
  const rps = Math.round(totalRequests / totalTime);

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`📊 RESULTS`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`Total Requests : ${totalRequests}`);
  console.log(`Total Errors   : ${totalErrors}`);
  console.log(`Total Time     : ${totalTime.toFixed(2)}s`);
  console.log(`Requests/sec   : ${rps}`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`Avg Latency    : ${avg}ms`);
  console.log(`P50 Latency    : ${p50}ms`);
  console.log(`P95 Latency    : ${p95}ms`);
  console.log(`P99 Latency    : ${p99}ms`);
  console.log(`Min Latency    : ${allLatencies[0]}ms`);
  console.log(`Max Latency    : ${allLatencies[allLatencies.length - 1]}ms`);
  console.log(`${'─'.repeat(40)}`);
}

runStressTest();