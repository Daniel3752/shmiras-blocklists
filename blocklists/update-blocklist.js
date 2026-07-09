/**
 * Shmiras Blocklist Updater
 * Merges existing public blocklists (no API keys needed)
 * Runs daily via GitHub Actions
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOCKLIST_PATH = path.join(__dirname, 'level1.json');

// Public blocklists to merge
const BLOCKLIST_SOURCES = {
  // EasyList - widely used filter list (contains adult site domains)
  easylist: 'https://easylist.to/easylist/easylist.txt',

  // Steven Black's hosts (includes adult sites)
  stevenBlack: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn/hosts',

  // UBlock Origin NSFW filter
  ublockNSFW: 'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/Alternate%20versions%20MobileFilter/NSFWBlocker.txt',
};

async function fetchBlocklist(url) {
  try {
    console.log(`[Fetch] ${url}`);
    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (err) {
    console.error(`[Error] Failed to fetch ${url}:`, err.message);
    return '';
  }
}

function extractDomainsFromHosts(text) {
  // Parse hosts file format (0.0.0.0 domain.com or 127.0.0.1 domain.com)
  const domains = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const domain = parts[1].toLowerCase();
      if (domain && domain.includes('.')) {
        domains.push(domain);
      }
    }
  }
  return domains;
}

function extractDomainsFromFilterList(text) {
  // Parse filter list format (domain filtering rules)
  const domains = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!')) continue;

    // Extract domain from various filter list formats
    // Format: domain rule patterns like ||example.com^ or domain=example.com
    let domain = null;

    if (trimmed.includes('||') && trimmed.includes('^')) {
      // ||domain.com^ format
      const match = trimmed.match(/\|\|([a-z0-9\-\.]+\.[a-z]{2,})\^/);
      if (match) domain = match[1];
    } else if (trimmed.includes('domain=')) {
      // domain=example.com format
      const match = trimmed.match(/domain=([a-z0-9\-\.]+\.[a-z]{2,})/);
      if (match) domain = match[1];
    }

    if (domain) {
      domains.push(domain.toLowerCase());
    }
  }
  return domains;
}

function categorizeSite(domain) {
  if (
    domain.includes('video') ||
    domain.includes('stream') ||
    domain.includes('porn') ||
    domain.includes('xxx') ||
    domain.includes('tube')
  ) {
    return 'video';
  }
  if (domain.includes('chat') || domain.includes('live') || domain.includes('cam')) {
    return 'chat';
  }
  if (domain.includes('forum') || domain.includes('board') || domain.includes('chan')) {
    return 'forum';
  }
  return 'other';
}

async function updateBlocklist() {
  console.log('[Start] Updating blocklist from public sources...');

  // Load existing blocklist
  let blocklist = { video: [], chat: [], forum: [], other: [] };
  if (fs.existsSync(BLOCKLIST_PATH)) {
    const existing = JSON.parse(fs.readFileSync(BLOCKLIST_PATH, 'utf8'));
    blocklist = existing.level1 || blocklist;
  }

  const existingSet = new Set([
    ...blocklist.video,
    ...blocklist.chat,
    ...blocklist.forum,
    ...blocklist.other,
  ].map((d) => d.toLowerCase()));

  console.log(`[Current] ${existingSet.size} domains in blocklist`);

  // Fetch all sources in parallel
  const results = await Promise.all(
    Object.entries(BLOCKLIST_SOURCES).map(async ([name, url]) => ({
      name,
      content: await fetchBlocklist(url),
    }))
  );

  // Parse and extract domains
  const allDomains = new Set();

  for (const { name, content } of results) {
    let domains = [];

    if (name === 'stevenBlack') {
      domains = extractDomainsFromHosts(content);
    } else {
      // EasyList and UBlock use filter list format
      domains = extractDomainsFromFilterList(content);
    }

    console.log(`[Parsed] ${name}: ${domains.length} domains`);
    domains.forEach((d) => allDomains.add(d.toLowerCase()));
  }

  console.log(`[Merged] ${allDomains.size} unique domains from all sources`);

  // Filter to only explicit/adult domains (simple keyword filtering)
  const adultKeywords = [
    'porn',
    'xxx',
    'adult',
    'sex',
    'nsfw',
    'erotic',
    'cam',
    'nude',
    'naked',
    'hentai',
    'fetish',
  ];

  const adultDomains = Array.from(allDomains).filter((domain) => {
    return adultKeywords.some((keyword) => domain.includes(keyword));
  });

  console.log(`[Filtered] ${adultDomains.length} domains match adult keywords`);

  // Find new sites to add
  const newSites = adultDomains.filter((d) => !existingSet.has(d));
  console.log(`[New] ${newSites.length} new sites to add`);

  if (newSites.length === 0) {
    console.log('[Done] No new sites found');
    return;
  }

  // Categorize and add
  for (const domain of newSites) {
    const category = categorizeSite(domain);
    blocklist[category].push(domain);
  }

  // Sort each category for consistency
  for (const category in blocklist) {
    blocklist[category].sort();
  }

  // Save blocklist
  const output = {
    version: '1.0',
    updated: new Date().toISOString(),
    description: 'Level 1 blocklist: explicit/pornographic sites (merged from public blocklists)',
    level1: blocklist,
  };

  fs.writeFileSync(BLOCKLIST_PATH, JSON.stringify(output, null, 2));
  console.log(`[Done] Blocklist updated: ${newSites.length} new sites added`);
  console.log(`[Stats] video: ${blocklist.video.length}, chat: ${blocklist.chat.length}, forum: ${blocklist.forum.length}, other: ${blocklist.other.length}`);
}

updateBlocklist().catch(console.error);
