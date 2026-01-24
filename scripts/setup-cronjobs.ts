#!/usr/bin/env npx ts-node
/**
 * CityPing CRON Job Setup Script
 *
 * Registers all CRON jobs with cron-job.org API
 *
 * Usage:
 *   1. Get your API key from https://cron-job.org/en/members/api/
 *   2. Run: CRONJOB_API_KEY=your_key npx ts-node scripts/setup-cronjobs.ts
 *
 * Or set in .env:
 *   CRONJOB_API_KEY=your_api_key
 *   CITYPING_BASE_URL=https://cityping.nyc
 */

import 'dotenv/config';

const API_KEY = process.env.CRONJOB_API_KEY;
const BASE_URL = process.env.CITYPING_BASE_URL || 'https://cityping.nyc';
const CRON_SECRET = process.env.CRON_SECRET || 'parkping-cron-secret-2024';

interface CronJob {
  title: string;
  url: string;
  schedule: {
    timezone: string;
    hours: number[];
    mdays: number[];
    minutes: number[];
    months: number[];
    wdays: number[];
  };
  requestMethod: number; // 0 = GET
  extendedData: {
    headers: Record<string, string>;
  };
  enabled: boolean;
}

// Convert cron expression to cron-job.org format
function parseCron(expr: string): CronJob['schedule'] {
  const [minute, hour, mday, month, wday] = expr.split(' ');

  const parseField = (field: string, max: number): number[] => {
    if (field === '*') return Array.from({ length: max }, (_, i) => i);
    if (field.includes('/')) {
      const [, step] = field.split('/');
      return Array.from({ length: Math.ceil(max / parseInt(step)) }, (_, i) => i * parseInt(step));
    }
    if (field.includes(',')) {
      return field.split(',').map(Number);
    }
    return [parseInt(field)];
  };

  return {
    timezone: 'America/New_York',
    minutes: parseField(minute, 60),
    hours: parseField(hour, 24),
    mdays: parseField(mday, 32).map(d => d === 0 ? -1 : d), // -1 means every day
    months: parseField(month, 13).map(m => m === 0 ? -1 : m), // -1 means every month
    wdays: parseField(wday, 7).map(w => w === 0 ? -1 : w), // -1 means every day
  };
}

// All CityPing CRON jobs
const JOBS = [
  // === CRITICAL: Email Pipeline ===
  {
    title: 'CityPing - Pre-flight Check',
    path: '/api/jobs/preflight-check',
    cron: '30 6 * * *',
    priority: 1,
  },
  {
    title: 'CityPing - Daily Digest',
    path: '/api/jobs/send-daily-digest',
    cron: '0 7 * * *',
    priority: 1,
  },
  {
    title: 'CityPing - Daily Pulse',
    path: '/api/jobs/send-daily-pulse',
    cron: '0 7 * * *',
    priority: 1,
  },
  {
    title: 'CityPing - Day Ahead',
    path: '/api/jobs/send-day-ahead',
    cron: '0 12 * * *',
    priority: 1,
  },

  // === News Pipeline ===
  {
    title: 'CityPing - News Tier 1 (5am)',
    path: '/api/jobs/ingest/news-multi?tier=1',
    cron: '0 5 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Tier 1 (11am)',
    path: '/api/jobs/ingest/news-multi?tier=1',
    cron: '0 11 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Tier 1 (5pm)',
    path: '/api/jobs/ingest/news-multi?tier=1',
    cron: '0 17 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Tier 1 (11pm)',
    path: '/api/jobs/ingest/news-multi?tier=1',
    cron: '0 23 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Tier 2 (6am)',
    path: '/api/jobs/ingest/news-multi?tier=2',
    cron: '0 6 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Tier 2 (12pm)',
    path: '/api/jobs/ingest/news-multi?tier=2',
    cron: '0 12 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Tier 2 (6pm)',
    path: '/api/jobs/ingest/news-multi?tier=2',
    cron: '0 18 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Tier 3 (7am)',
    path: '/api/jobs/ingest/news-multi?tier=3',
    cron: '0 7 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Tier 3 (1pm)',
    path: '/api/jobs/ingest/news-multi?tier=3',
    cron: '0 13 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Tier 3 (7pm)',
    path: '/api/jobs/ingest/news-multi?tier=3',
    cron: '0 19 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Curation (6:30am)',
    path: '/api/jobs/curate-news',
    cron: '30 6 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Curation (12:30pm)',
    path: '/api/jobs/curate-news',
    cron: '30 12 * * *',
    priority: 2,
  },
  {
    title: 'CityPing - News Curation (6:30pm)',
    path: '/api/jobs/curate-news',
    cron: '30 18 * * *',
    priority: 2,
  },

  // === Data Scrapers ===
  {
    title: 'CityPing - MTA Alerts',
    path: '/api/jobs/ingest/mta-alerts',
    cron: '*/5 * * * *',
    priority: 3,
  },
  {
    title: 'CityPing - Sample Sales',
    path: '/api/jobs/ingest/sample-sales',
    cron: '0 8 * * *',
    priority: 3,
  },
  {
    title: 'CityPing - Housing Lotteries',
    path: '/api/jobs/ingest/housing-lotteries',
    cron: '0 8 * * *',
    priority: 3,
  },
  {
    title: 'CityPing - 311 Alerts (every 4hr)',
    path: '/api/jobs/scrape-311',
    cron: '0 */4 * * *',
    priority: 3,
  },
  {
    title: 'CityPing - Air Quality (6am)',
    path: '/api/jobs/scrape-air-quality',
    cron: '0 6 * * *',
    priority: 3,
  },
  {
    title: 'CityPing - Air Quality (12pm)',
    path: '/api/jobs/scrape-air-quality',
    cron: '0 12 * * *',
    priority: 3,
  },
  {
    title: 'CityPing - Air Quality (6pm)',
    path: '/api/jobs/scrape-air-quality',
    cron: '0 18 * * *',
    priority: 3,
  },
  {
    title: 'CityPing - Dining Deals',
    path: '/api/jobs/scrape-dining',
    cron: '0 8 * * *',
    priority: 3,
  },
  {
    title: 'CityPing - Parks Events',
    path: '/api/jobs/scrape-parks',
    cron: '0 7 * * *',
    priority: 3,
  },

  // === Health Monitoring ===
  {
    title: 'CityPing - Infrastructure Health',
    path: '/api/health?infra=true&alert=true',
    cron: '0 */2 * * *',
    priority: 1,
  },
  {
    title: 'CityPing - Data Orchestrator',
    path: '/api/jobs/orchestrate-data',
    cron: '0 * * * *',
    priority: 2,
  },
  {
    title: 'CityPing - Data Orchestrator (half hour)',
    path: '/api/jobs/orchestrate-data',
    cron: '30 * * * *',
    priority: 2,
  },
];

async function createJob(job: typeof JOBS[0]): Promise<{ success: boolean; id?: number; error?: string }> {
  const url = `${BASE_URL}${job.path}`;
  const schedule = parseCron(job.cron);

  const payload: CronJob = {
    title: job.title,
    url,
    schedule,
    requestMethod: 0, // GET
    extendedData: {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'x-cron-secret': CRON_SECRET,
      },
    },
    enabled: true,
  };

  try {
    const response = await fetch('https://api.cron-job.org/jobs', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job: payload }),
    });

    const data = await response.json();

    if (response.ok && data.jobId) {
      return { success: true, id: data.jobId };
    } else {
      return { success: false, error: data.error || 'Unknown error' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           CityPing CRON Job Setup Script                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  if (!API_KEY) {
    console.error('❌ CRONJOB_API_KEY not set!');
    console.error('');
    console.error('Get your API key from: https://cron-job.org/en/members/api/');
    console.error('Then run: CRONJOB_API_KEY=your_key npx ts-node scripts/setup-cronjobs.ts');
    process.exit(1);
  }

  console.log(`📡 Base URL: ${BASE_URL}`);
  console.log(`🔑 CRON Secret: ${CRON_SECRET.slice(0, 10)}...`);
  console.log(`📋 Jobs to create: ${JOBS.length}`);
  console.log();

  let created = 0;
  let failed = 0;

  // Group by priority
  const byPriority = JOBS.reduce((acc, job) => {
    acc[job.priority] = acc[job.priority] || [];
    acc[job.priority].push(job);
    return acc;
  }, {} as Record<number, typeof JOBS>);

  const priorityLabels: Record<number, string> = {
    1: '🔴 CRITICAL (Email Pipeline)',
    2: '🟡 IMPORTANT (News & Data)',
    3: '🟢 STANDARD (Scrapers)',
  };

  for (const priority of [1, 2, 3]) {
    const jobs = byPriority[priority] || [];
    if (jobs.length === 0) continue;

    console.log(`\n${priorityLabels[priority]}`);
    console.log('─'.repeat(50));

    for (const job of jobs) {
      process.stdout.write(`  ${job.title}... `);

      const result = await createJob(job);

      if (result.success) {
        console.log(`✅ Created (ID: ${result.id})`);
        created++;
      } else {
        console.log(`❌ Failed: ${result.error}`);
        failed++;
      }

      // Rate limit - cron-job.org has limits
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log();
  console.log('═'.repeat(50));
  console.log(`✅ Created: ${created}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${JOBS.length}`);
  console.log();

  if (failed > 0) {
    console.log('⚠️  Some jobs failed. Check https://cron-job.org/en/members/jobs/');
    process.exit(1);
  } else {
    console.log('🎉 All jobs created successfully!');
    console.log('📍 Manage at: https://cron-job.org/en/members/jobs/');
  }
}

main().catch(console.error);
