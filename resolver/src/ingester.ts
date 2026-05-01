import axios from 'axios';
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const THREAT_FEED_URL = 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts';

async function ingest() {
  console.log('⏳ Downloading threat feed...');
  
  try {
    const { data } = await axios.get(THREAT_FEED_URL);
    
    // Split by lines and filter out comments (#) and empty lines
    const lines = data.split('\n');
    const domains = lines
      .map((line: string) => line.trim())
      .filter((line: string) => line && !line.startsWith('#'))
      .map((line: string) => {
        // Line format is usually: 0.0.0.0 domain.com
        const parts = line.split(/\s+/);
        return parts.length > 1 ? parts[1] : null;
      })
      .filter((domain: string | null) => 
        domain && 
        domain !== '0.0.0.0' && 
        domain !== 'localhost'
      );

    console.log(`🧹 Cleaned up ${domains.length} domains. Updating Redis...`);

    // Upstash has a limit on how many items you can send in one SADD command
    // So we'll process them in chunks of 1000
    const chunkSize = 1000;
    for (let i = 0; i < domains.length; i += chunkSize) {
      const chunk = domains.slice(i, i + chunkSize);
      if (chunk.length > 0) {
        await redis.sadd('blocklist', ...chunk as [string, ...string[]]);
      }
      if (i % 10000 === 0) console.log(`✅ Progress: ${i}/${domains.length}`);
    }

    console.log('🚀 Threat feed successfully synchronized!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
}

ingest();