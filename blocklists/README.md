# Shmiras Blocklists

Automatically updated remote blocklists for the Shmiras extension. Two tiers:
- **Level 1** (`level1.json`) — Explicit/pornographic sites (updated daily)
- **Level 2** (`level2.json`) — Level 1 + social media (updated weekly manually)

## How It Works

### Daily Update (Level 1 only)
1. GitHub Actions runs at 2 AM UTC every day
2. Fetches and merges public blocklists:
   - **EasyList** — widely maintained filter list
   - **Steven Black's hosts** — curated blocklists
   - **UBlock Origin NSFW filter** — community-maintained NSFW list
3. Extracts domains, deduplicates, filters by keyword
4. Adds new sites to `level1.json`
5. Auto-commits if changes found

### Keyword Filtering
Simple keyword matching on domain names. Looks for: `porn`, `xxx`, `adult`, `sex`, `nsfw`, `cam`, `nude`, `hentai`, `fetish`, etc.

Categorizes into: `video`, `chat`, `forum`, `other`.

### Sources (No API keys needed)
- Public blocklists only
- EasyList maintained by community
- Steven Black's hosts on GitHub
- UBlock Origin filters

## Setup (GitHub)

### 1. Create a private GitHub repo
```bash
git clone https://github.com/YOUR-USERNAME/shmiras-blocklists.git
cd shmiras-blocklists
git add .
git commit -m "Initial blocklist setup"
git push -u origin main
```

### 2. No API Keys Needed!
The workflow uses only public blocklists. No secrets to add.

### 3. Confirm workflow runs
The `.github/workflows/update-blocklist.yml` will trigger automatically daily at 2 AM UTC, or you can manually trigger via **Actions** tab.

## Extension Integration

The extension fetches the lists like this:

```javascript
const level1 = await fetch('https://raw.githubusercontent.com/your-org/shmiras-blocklists/main/blocklists/level1.json').then(r => r.json());
```

Cache locally with 24-hour TTL to avoid hammering GitHub.

## Manual Testing Locally

```bash
cd blocklists
export GOOGLE_API_KEY="your-key"
export GOOGLE_CSE_ID="your-cse-id"
npm install
npm run update
```

## Cost

- GitHub Actions: free (2000 minutes/month included)
- Public blocklists: free (no API calls, just HTTP fetches)
- **Monthly cost: $0 (completely free)**

## Known Limitations

- Relies on existing public blocklists (EasyList, Steven Black's, UBlock)
- Keyword filtering can have false positives (e.g., "adult content management" as a job listing)
- New sites only added as they appear in public blocklists (usually 1-7 days after discovery)

## Future Improvements

- Manual review step before adding (approve/reject new sites)
- Weekly Level 2 (social media) updates
- Community submissions + voting
- Integration with blocklist aggregators (EasyList, etc.)
