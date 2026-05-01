import express, { type Request, type Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';
import { PrismaClient } from '@prisma/client';
import * as dnsPacket from 'dns-packet';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const UPSTREAM_DNS = 'https://cloudflare-dns.com/dns-query';

// Initialize Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─── Raw body parser for binary DNS messages ───────────────────────────────
app.use('/dns-query', (req: Request, res: Response, next) => {
  if (req.headers['content-type'] === 'application/dns-message') {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      req.body = Buffer.concat(chunks);
      next();
    });
  } else {
    next();
  }
});

// ─── Helper: convert DNS record type number to string ──────────────────────
function typeNumberToString(type: number): string {
  const types: Record<number, string> = {
    1: 'A',
    28: 'AAAA',
    5: 'CNAME',
    15: 'MX',
    16: 'TXT',
    2: 'NS',
    6: 'SOA',
  };
  return types[type] || 'A';
}

// ─── Helper: convert JSON DNS response to binary DNS packet ───────────────
function jsonToDnsPacket(query: dnsPacket.Packet, jsonData: any): Buffer {
  const answers = (jsonData.Answer || []).map((ans: any) => {
    const type = typeNumberToString(ans.type);
    const base = { type, name: ans.name, ttl: ans.TTL };

    if (type === 'MX') {
      const [preference, exchange] = ans.data.split(' ');
      return { ...base, data: { preference: parseInt(preference), exchange } };
    }
    if (type === 'TXT') {
      return { ...base, data: [ans.data] };
    }
    return { ...base, data: ans.data };
  });

  return dnsPacket.encode({
    type: 'response',
    id: query.id,
    flags: dnsPacket.RECURSION_DESIRED | dnsPacket.RECURSION_AVAILABLE,
    questions: query.questions,
    answers,
  } as dnsPacket.Packet);
}

async function logQueryResolution(
  domain: string,
  recordType: string,
  result: Awaited<ReturnType<typeof resolveDomain>>,
  duration: number
) {
  await prisma.queryLog.create({
    data: {
      domain,
      type: recordType,
      blocked: result.blocked,
      cacheHit: result.cacheHit,
      responseTimeMs: Math.round(duration),
      resolvedIp: result.resolvedIp,
    },
  });
}

// ─── Shared resolution logic ───────────────────────────────────────────────
async function resolveDomain(domain: string, recordType: string) {
  const cacheKey = `dns:${domain}:${recordType}`;

  // 1. BLOCKLIST CHECK
  const isBlocked = (await redis.sismember('blocklist', domain)) === 1;
  if (isBlocked) {
    return {
      blocked: true,
      data: {
        Status: 0,
        Answer: [{ name: domain, type: 1, TTL: 3600, data: '0.0.0.0' }],
        Comment: 'Blocked by Shield',
      },
      cacheHit: false,
      resolvedIp: '0.0.0.0',
    };
  }

  // 2. CACHE CHECK
  const cachedResponse: any = await redis.get(cacheKey);
  if (cachedResponse) {
    return {
      blocked: false,
      data: cachedResponse,
      cacheHit: true,
      resolvedIp: cachedResponse.Answer?.[0]?.data || null,
    };
  }

  // 3. UPSTREAM FETCH
  let data;
  try {
    const response = await axios.get(UPSTREAM_DNS, {
      params: { name: domain, type: recordType },
      headers: { Accept: 'application/dns-json' },
    });
    data = response.data;
  } catch (upstreamError: any) {
    // Upstream rejected this query type — return empty NOERROR response
    console.log(`[DNS] Upstream rejected ${domain} (${recordType}) — returning empty response`);
    data = { Status: 0, Answer: [] };
  }

  // 4. CACHE (only if we got a real answer)
  if (data.Answer?.length > 0) {
    const ttl = data.Answer[0].TTL || 60;
    await redis.set(cacheKey, data, { ex: ttl });
  }

  return {
    blocked: false,
    data,
    cacheHit: false,
    resolvedIp: data.Answer?.[0]?.data || null,
  };
}

// ─── GET /dns-query — JSON format (programmatic / curl / browser URL) ──────
app.get('/dns-query', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { name, type } = req.query;

  if (!name) return res.status(400).json({ error: 'Missing name' });

  const domain = (name as string).toLowerCase();
  const recordType = (type as string) || 'A';

  try {
    const result = await resolveDomain(domain, recordType);
    const duration = Date.now() - startTime;

    try {
      await logQueryResolution(domain, recordType, result, duration);
    } catch (e) {
      console.error('Log Error:', e);
    }

    console.log(
      `[DNS][JSON] ${result.blocked ? 'Blocked' : result.cacheHit ? 'Cache hit' : 'Resolved'} ${domain} (${recordType}) in ${duration}ms`
    );

    return res.status(200).json(result.data);
  } catch (error: any) {
    console.error('Error:', error.message);
    return res.status(502).json({ error: 'DNS Resolution Failed' });
  }
});

// ─── POST /dns-query — Binary wire format (browsers / native DoH clients) ──
app.post('/dns-query', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Decode binary DNS query
    const query = dnsPacket.decode(req.body as Buffer) as dnsPacket.Packet;
    const question = query.questions?.[0];
    if (!question) return res.status(400).end();

    const domain = question.name.toLowerCase();
    const recordType =
      typeof question.type === 'string'
        ? question.type.toUpperCase()
        : typeNumberToString(question.type as unknown as number).toUpperCase();

    const result = await resolveDomain(domain, recordType);
    const duration = Date.now() - startTime;

    try {
      await logQueryResolution(domain, recordType, result, duration);
    } catch (e) {
      console.error('Log Error:', e);
    }

    console.log(
      `[DNS][BINARY] ${result.blocked ? 'Blocked' : result.cacheHit ? 'Cache hit' : 'Resolved'} ${domain} (${recordType}) in ${duration}ms`
    );

    // Encode response as binary DNS packet
    const responseBuffer = jsonToDnsPacket(query, result.data);
    res.set('Content-Type', 'application/dns-message');
    return res.send(responseBuffer);
  } catch (error: any) {
    console.error('Binary DNS Error:', error.message);
    return res.status(502).end();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 DoH Resolver running on http://localhost:${PORT}`);
});