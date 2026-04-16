# Metorik CLI

An installable, agent-friendly CLI for the Metorik API.

It is built for the current beta API on `metorik.dev`, with a shape that feels close to newer API CLIs: easy install, token auth, JSON-first output, and direct endpoint coverage for agents and automation.

## Install

```bash
npm install -g metorik
```

You can also run it without installing globally:

```bash
npx metorik@latest commands
pnpm dlx metorik commands
bunx metorik commands
```

## Authenticate

Store your API key locally:

```bash
metorik auth login YOUR_API_KEY
metorik auth login
```

Get your key here:

`https://app.metorik.com/settings/stores/current?area=api`

Or use environment variables:

```bash
export METORIK_API_KEY=YOUR_API_KEY
export METORIK_BASE_URL=https://app.metorik.com/api/v1/store
```

## Why this shape

- JSON-first output for agents, scripts, and piping into other tools
- simple top-level resource commands for common data endpoints
- grouped report and Engage commands that mirror the docs closely
- `request` escape hatch for anything new in the API before a first-class command lands
- `commands` endpoint catalog so an agent can discover supported operations quickly

## Examples

Search customers:

```bash
metorik search customers jarvis --count 5
```

Get the last 30 days of product sales:

```bash
metorik products --last 30 --search hoodie --per-page 25
```

Revenue by date:

```bash
metorik reports revenue-by-date --last 30 --group-by day
```

Revenue grouped by billing country:

```bash
metorik reports revenue-grouped-by --last 90 --grouped-by billing_address_country
```

Create or update an Engage profile:

```bash
metorik engage profile upsert \
  --email taylor@example.com \
  --first-name Taylor \
  --last-name Smith \
  --consent single
```

Call an endpoint directly:

```bash
metorik request GET /reports/sources-utms \
  --query start_date=2026-03-01 \
  --query end_date=2026-03-31 \
  --query source_type=utm_source,utm_campaign
```

List supported built-in commands:

```bash
metorik commands
```

## Command overview

Top-level data endpoints:

- `metorik store`
- `metorik search <resource> <query>`
- `metorik products`
- `metorik variations`
- `metorik categories`
- `metorik brands`
- `metorik coupons`
- `metorik custom-metrics`
- `metorik custom-metrics value <metric>`

Reports:

- `metorik reports customers-by-date`
- `metorik reports orders-by-date`
- `metorik reports revenue-by-date`
- `metorik reports profit-by-date`
- `metorik reports advertising-costs-by-date`
- `metorik reports subscriptions-stats`
- `metorik reports revenue-grouped-by`
- `metorik reports orders-grouped-by`
- `metorik reports customers-grouped-by`
- `metorik reports sources`
- `metorik reports sources-landing`
- `metorik reports sources-utms`
- `metorik reports customer-sources`
- `metorik reports customer-sources-landing`
- `metorik reports customer-sources-utms`

Note: `--group-by hour` is only valid on the time-series report endpoints when the selected range is under 1 month.

Engage:

- `metorik engage profile upsert`
- `metorik engage profile get`
- `metorik engage profile delete`
- `metorik engage unsubscribes list`
- `metorik engage unsubscribes status`
- `metorik engage unsubscribes add`
- `metorik engage unsubscribes remove`

## Development

```bash
npm install
npm run build
npm test
```

## Run as `metorik` locally

Link the package into your global npm bin:

```bash
npm run link-local
```

Then you can use it like a normal installed CLI:

```bash
metorik commands
metorik auth login YOUR_API_KEY
metorik products --last 30
```

Remove the local link when you are done:

```bash
npm run unlink-local
```

If you update the source, rebuild before testing the linked binary:

```bash
npm run build
```

## Publish

```bash
nvm use 20
yarn
yarn run build
npm publish --access public
```
