import express, { type Request, type Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';
import { PrismaClient } from '@prisma/client';

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

app.get('/dns-query', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { name, type } = req.query;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    
    const domain = (name as string).toLowerCase();
    const recordType = (type as string) || 'A';
    const cacheKey = `dns:${domain}:${recordType}`;

    try {
        // 1. BLOCKLIST CHECK
        const isBlocked = (await redis.sismember('blocklist', domain)) === 1;
        
        if (isBlocked) {
            const duration = Date.now() - startTime;
            console.log(`[DNS] Blocked ${domain} (${recordType})`);
            const blockedResponse = {
                Status: 0,
                Answer: [{ name: domain, type: 1, TTL: 3600, data: '0.0.0.0' }],
                Comment: "Blocked by Shield"
            };

            // Direct Async Log to Postgres
            prisma.queryLog.create({
                data: { domain, type: recordType, blocked: true, cacheHit: false, responseTimeMs: duration, resolvedIp: '0.0.0.0' }
            }).catch(e => console.error("Log Error:", e));

            return res.status(200).json(blockedResponse);
        }

        // 2. CACHE CHECK
        const cachedResponse: any = await redis.get(cacheKey);
        if (cachedResponse) {
            const duration = Date.now() - startTime;
            console.log(`[DNS] Cache hit for ${domain} (${recordType})`);

            prisma.queryLog.create({
                data: { domain, type: recordType, blocked: false, cacheHit: true, responseTimeMs: duration, resolvedIp: cachedResponse.Answer?.[0]?.data || null }
            }).catch(e => console.error("Log Error:", e));

            return res.status(200).json(cachedResponse);
        }

        // 3. UPSTREAM FETCH
        console.log(`[DNS] Cache miss for ${domain} (${recordType})`);
        const response = await axios.get(UPSTREAM_DNS, {
            params: { name: domain, type: recordType },
            headers: { 'Accept': 'application/dns-json' }
        });

        const data = response.data;
        const duration = Date.now() - startTime;

        // 4. SAVE TO CACHE & LOG
        const ttl = data.Answer?.[0]?.TTL || 60;
        await redis.set(cacheKey, data, { ex: ttl });

        prisma.queryLog.create({
            data: { domain, type: recordType, blocked: false, cacheHit: false, responseTimeMs: duration, resolvedIp: data.Answer?.[0]?.data || null }
        }).catch(e => console.error("Log Error:", e));

        return res.status(200).json(data);

    } catch (error: any) {
        console.error('Error:', error.message);
        return res.status(502).json({ error: 'DNS Resolution Failed' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Resolver back to stable version on http://localhost:${PORT}`);
});