#!/usr/bin/env node

import { Command, Option } from "commander";
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type HttpMethod = "GET" | "POST" | "DELETE";

type Endpoint = {
  command: string;
  method: HttpMethod;
  path: string;
  required?: string[];
  optional?: string[];
  enums?: Record<string, string[]>;
  description: string;
};

type CliConfig = {
  apiKey?: string;
  baseUrl?: string;
};

type RuntimeOptions = {
  apiKey?: string;
  baseUrl?: string;
};

const defaultBaseUrl = "https://app.metorik.com/api/v1/store";

const searchResources = [
  "orders",
  "customers",
  "subscriptions",
  "refunds",
  "products",
  "variations",
  "categories",
  "coupons"
] as const;

const sourceFields = [
  "utm_campaign",
  "utm_medium",
  "utm_source",
  "utm_term",
  "utm_content",
  "utm_id"
] as const;

const endpoints: Record<string, Endpoint> = {
  search: {
    command: "search",
    method: "GET",
    path: "/search",
    required: ["resource", "query"],
    optional: ["count"],
    enums: { resource: [...searchResources] },
    description: "Search customers, orders, products, and more"
  },
  products: {
    command: "products",
    method: "GET",
    path: "/products",
    required: ["start_date", "end_date"],
    optional: ["page", "per_page", "order_by", "order_dir", "search"],
    enums: {
      order_by: [
        "title",
        "sku",
        "product_id",
        "product_created_at",
        "product_updated_at",
        "gross_items_sold",
        "items_refunded",
        "net_items_sold",
        "gross_sales",
        "net_orders",
        "net_sales",
        "first_sold",
        "last_sold"
      ],
      order_dir: ["asc", "desc"]
    },
    description: "List product sales for a date range"
  },
  variations: {
    command: "variations",
    method: "GET",
    path: "/variations",
    required: ["start_date", "end_date"],
    optional: ["page", "per_page", "order_by", "order_dir", "search"],
    enums: {
      order_by: [
        "sku",
        "variation_id",
        "variation_created_at",
        "variation_updated_at",
        "gross_items_sold",
        "items_refunded",
        "net_items_sold",
        "gross_sales",
        "net_orders",
        "net_sales",
        "first_sold",
        "last_sold"
      ],
      order_dir: ["asc", "desc"]
    },
    description: "List variation sales for a date range"
  },
  categories: {
    command: "categories",
    method: "GET",
    path: "/categories",
    required: ["start_date", "end_date"],
    optional: ["page", "per_page", "order_by", "order_dir", "search"],
    enums: {
      order_by: [
        "name",
        "category_id",
        "products",
        "gross_items_sold",
        "items_refunded",
        "net_items_sold",
        "gross_sales",
        "net_orders",
        "net_sales"
      ],
      order_dir: ["asc", "desc"]
    },
    description: "List category sales for a date range"
  },
  brands: {
    command: "brands",
    method: "GET",
    path: "/brands",
    required: ["start_date", "end_date"],
    optional: ["page", "per_page", "search"],
    description: "List brand sales for a date range"
  },
  coupons: {
    command: "coupons",
    method: "GET",
    path: "/coupons",
    required: ["start_date", "end_date"],
    optional: ["page", "per_page", "order_by", "order_dir", "search"],
    enums: {
      order_by: [
        "code",
        "coupon_id",
        "coupon_created_at",
        "coupon_updated_at",
        "amount",
        "usage_count",
        "total_discounted",
        "sales_generated",
        "sales_generated_gross_profit",
        "last_used_at"
      ],
      order_dir: ["asc", "desc"]
    },
    description: "List coupon usage for a date range"
  },
  "reports:customers-by-date": {
    command: "reports customers-by-date",
    method: "GET",
    path: "/reports/customers-by-date",
    required: ["start_date", "end_date"],
    optional: ["group_by"],
    enums: { group_by: ["hour", "day", "week", "month", "year"] },
    description: "Customer growth over time"
  },
  "reports:orders-by-date": {
    command: "reports orders-by-date",
    method: "GET",
    path: "/reports/orders-by-date",
    required: ["start_date", "end_date"],
    optional: ["group_by"],
    enums: { group_by: ["hour", "day", "week", "month", "year"] },
    description: "Order metrics over time"
  },
  "reports:revenue-by-date": {
    command: "reports revenue-by-date",
    method: "GET",
    path: "/reports/revenue-by-date",
    required: ["start_date", "end_date"],
    optional: ["group_by"],
    enums: { group_by: ["hour", "day", "week", "month", "year"] },
    description: "Revenue metrics over time"
  },
  "reports:profit-by-date": {
    command: "reports profit-by-date",
    method: "GET",
    path: "/reports/profit-by-date",
    required: ["start_date", "end_date"],
    optional: ["group_by"],
    enums: { group_by: ["hour", "day", "week", "month", "year"] },
    description: "Profit metrics over time"
  },
  "reports:subscriptions-stats": {
    command: "reports subscriptions-stats",
    method: "GET",
    path: "/reports/subscriptions-stats",
    required: ["start_date", "end_date"],
    optional: ["group_by"],
    enums: { group_by: ["day", "week", "month"] },
    description: "Subscription and MRR stats over time"
  },
  "reports:revenue-grouped-by": {
    command: "reports revenue-grouped-by",
    method: "GET",
    path: "/reports/revenue-grouped-by",
    required: ["start_date", "end_date", "grouped_by"],
    enums: {
      grouped_by: [
        "billing_address_country",
        "billing_address_state",
        "billing_address_city",
        "billing_address_postcode",
        "shipping_address_country",
        "shipping_address_state",
        "shipping_address_city",
        "shipping_address_postcode",
        "payment_method",
        "payment_method_title",
        "shipping_method_id",
        "shipping_method_title",
        "currency",
        "created_via",
        "order_type",
        "tax_rate_code",
        "tax_rate_label",
        "tax_rate_id",
        "customer_role"
      ]
    },
    description: "Revenue grouped by a store dimension"
  },
  "reports:orders-grouped-by": {
    command: "reports orders-grouped-by",
    method: "GET",
    path: "/reports/orders-grouped-by",
    required: ["start_date", "end_date", "grouped_by"],
    enums: {
      grouped_by: [
        "billing_address_country",
        "billing_address_state",
        "billing_address_city",
        "billing_address_postcode",
        "billing_address_company",
        "shipping_address_country",
        "shipping_address_state",
        "shipping_address_city",
        "shipping_address_postcode",
        "shipping_address_company",
        "status",
        "customer_role",
        "payment_method",
        "payment_method_title",
        "shipping_method_id",
        "shipping_method_title",
        "fee_line_title",
        "currency",
        "created_via",
        "order_type",
        "custom_field"
      ]
    },
    description: "Orders grouped by a store dimension"
  },
  "reports:customers-grouped-by": {
    command: "reports customers-grouped-by",
    method: "GET",
    path: "/reports/customers-grouped-by",
    required: ["start_date", "end_date", "grouped_by"],
    enums: {
      grouped_by: [
        "billing_address_country",
        "billing_address_state",
        "billing_address_city",
        "billing_address_postcode",
        "billing_address_company",
        "shipping_address_country",
        "shipping_address_state",
        "shipping_address_city",
        "shipping_address_postcode",
        "shipping_address_company",
        "role",
        "customer_type",
        "custom_field",
        "day",
        "week",
        "month",
        "year",
        "first_product",
        "first_category",
        "first_coupon"
      ]
    },
    description: "Customers grouped by a store dimension"
  },
  "reports:sources": {
    command: "reports sources",
    method: "GET",
    path: "/reports/sources",
    required: ["start_date", "end_date"],
    optional: ["specific"],
    description: "Order sources by referrer"
  },
  "reports:sources-landing": {
    command: "reports sources-landing",
    method: "GET",
    path: "/reports/sources-landing",
    required: ["start_date", "end_date"],
    description: "Order sources by landing path"
  },
  "reports:sources-utms": {
    command: "reports sources-utms",
    method: "GET",
    path: "/reports/sources-utms",
    required: ["start_date", "end_date", "source_type"],
    enums: { source_type: [...sourceFields] },
    description: "Order sources grouped by UTM fields"
  },
  "reports:customer-sources": {
    command: "reports customer-sources",
    method: "GET",
    path: "/reports/customer-sources",
    required: ["start_date", "end_date"],
    description: "Customer acquisition sources by referrer"
  },
  "reports:customer-sources-landing": {
    command: "reports customer-sources-landing",
    method: "GET",
    path: "/reports/customer-sources-landing",
    required: ["start_date", "end_date"],
    description: "Customer acquisition sources by landing path"
  },
  "reports:customer-sources-utms": {
    command: "reports customer-sources-utms",
    method: "GET",
    path: "/reports/customer-sources-utms",
    required: ["start_date", "end_date", "source_type"],
    enums: { source_type: [...sourceFields] },
    description: "Customer acquisition grouped by UTM fields"
  },
  "engage:profiles:upsert": {
    command: "engage profile upsert",
    method: "POST",
    path: "/engage/profiles",
    required: ["email"],
    optional: ["first_name", "last_name", "country", "company", "consent"],
    enums: { consent: ["single", "double"] },
    description: "Create or update an Engage profile"
  },
  "engage:profiles:delete": {
    command: "engage profile delete",
    method: "DELETE",
    path: "/engage/profiles",
    required: ["email"],
    description: "Delete an Engage profile"
  },
  "engage:unsubscribes:list": {
    command: "engage unsubscribes list",
    method: "GET",
    path: "/engage/unsubscribes",
    optional: ["after", "before", "order", "per_page", "page"],
    enums: { order: ["asc", "desc"] },
    description: "List Engage unsubscribes"
  },
  "engage:unsubscribes:status": {
    command: "engage unsubscribes status",
    method: "GET",
    path: "/engage/unsubscribe-status",
    required: ["email"],
    description: "Check an email's unsubscribe status"
  },
  "engage:unsubscribes:add": {
    command: "engage unsubscribes add",
    method: "POST",
    path: "/engage/unsubscribes",
    required: ["email"],
    optional: ["reason"],
    description: "Create or update an unsubscribe"
  },
  "engage:unsubscribes:remove": {
    command: "engage unsubscribes remove",
    method: "DELETE",
    path: "/engage/unsubscribes",
    required: ["email"],
    description: "Delete an unsubscribe"
  }
};

function configPath() {
  const root = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(root, "metorik", "config.json");
}

function loadConfig(): CliConfig {
  const file = configPath();
  if (!existsSync(file)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(file, "utf8")) as CliConfig;
  } catch {
    return {};
  }
}

function saveConfig(config: CliConfig) {
  const file = configPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function deleteConfig() {
  const file = configPath();
  if (existsSync(file)) {
    rmSync(file);
  }
}

function parseDateRange(options: { startDate?: string; endDate?: string; last?: string }) {
  if (options.startDate && options.endDate) {
    return { start_date: options.startDate, end_date: options.endDate };
  }

  if (!options.last) {
    throw new Error("Provide --start-date and --end-date, or use --last <days>");
  }

  const days = Number(options.last);
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("--last must be a positive integer");
  }

  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  return {
    start_date: isoDate(start),
    end_date: isoDate(end)
  };
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function printJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(message: string): never {
  process.stderr.write(`metorik: ${message}\n`);
  process.exit(1);
}

function getRuntimeOptions(command: Command): Required<RuntimeOptions> {
  const flags = command.optsWithGlobals<RuntimeOptions>();
  const config = loadConfig();
  const apiKey = flags.apiKey || process.env.METORIK_API_KEY || config.apiKey;
  const baseUrl = flags.baseUrl || process.env.METORIK_BASE_URL || config.baseUrl || defaultBaseUrl;

  if (!apiKey) {
    fail("missing API key. Use `metorik auth login <key>` or set `METORIK_API_KEY`");
  }

  return { apiKey, baseUrl };
}

async function requestJson(args: {
  command: Command;
  endpoint: Endpoint;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}) {
  validateParams(args.endpoint, args.query ?? args.body ?? {});
  const runtime = getRuntimeOptions(args.command);
  const url = new URL(joinUrlPath(runtime.baseUrl, args.endpoint.path));

  if (args.query) {
    for (const [key, value] of Object.entries(args.query)) {
      if (value === undefined || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: args.endpoint.method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${runtime.apiKey}`,
      ...(args.body ? { "Content-Type": "application/json" } : {})
    },
    body: args.body ? JSON.stringify(compactObject(args.body)) : undefined
  });

  const text = await response.text();
  const data = text ? safeJson(text) : { ok: response.ok };

  if (!response.ok) {
    const message = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    fail(`request failed (${response.status} ${response.statusText})\n${message}`);
  }

  printJson(data);
}

function slashUrl(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function joinUrlPath(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "")) as T;
}

function validateParams(endpoint: Endpoint, params: Record<string, unknown>) {
  for (const field of endpoint.required ?? []) {
    if (params[field] === undefined || params[field] === "") {
      fail(`missing required field \`${field}\`. See \`${endpoint.command}\``);
    }
  }

  for (const [field, allowed] of Object.entries(endpoint.enums ?? {})) {
    const current = params[field];
    if (current === undefined || current === "") {
      continue;
    }

    if (field === "source_type") {
      const invalid = String(current)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !allowed.includes(item));

      if (invalid.length > 0) {
        fail(`invalid ${field}: ${invalid.join(", ")}. Allowed: ${allowed.join(", ")}`);
      }

      continue;
    }

    if (!allowed.includes(String(current))) {
      fail(`invalid ${field}: ${current}. Allowed: ${allowed.join(", ")}`);
    }
  }
}

function addDateOptions(command: Command) {
  return command
    .option("--start-date <date>", "Start date in YYYY-MM-DD")
    .option("--end-date <date>", "End date in YYYY-MM-DD")
    .option("--last <days>", "Shortcut for the last N days, inclusive");
}

function addPaginationOptions(command: Command) {
  return command.option("--page <number>", "Page number").option("--per-page <number>", "Items per page");
}

function addSortOptions(command: Command) {
  return command.option("--order-by <field>", "Sort field").option("--order-dir <direction>", "Sort direction");
}

function addSearchOption(command: Command) {
  return command.option("--search <term>", "Search filter");
}

function numberIfSet(value?: string) {
  if (value === undefined) {
    return undefined;
  }
  return Number(value);
}

function parseKeyValue(entry: string) {
  const index = entry.indexOf("=");
  if (index === -1) {
    fail(`expected key=value pair, received \`${entry}\``);
  }

  const key = entry.slice(0, index).trim();
  const raw = entry.slice(index + 1).trim();

  if (!key) {
    fail(`expected key=value pair, received \`${entry}\``);
  }

  return [key, coerceValue(raw)] as const;
}

function coerceValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith("{") && value.endsWith("}")) || (value.startsWith("[") && value.endsWith("]"))) {
    return safeJson(value);
  }
  return value;
}

function pairsToObject(items: string[]) {
  return Object.fromEntries(items.map(parseKeyValue));
}

function buildProgram() {
  const program = new Command();

  program
    .name("metorik")
    .description("Agent-friendly CLI for the Metorik API")
    .version("0.1.0")
    .showHelpAfterError()
    .option("-k, --api-key <key>", "Metorik API key")
    .option("--base-url <url>", "Override API base URL");

  program
    .command("auth")
    .description("Manage local Metorik credentials")
    .addCommand(
      new Command("login")
        .argument(
          "<apiKey>",
          "Metorik API key from https://app.metorik.com/settings/stores/current?area=api"
        )
        .option("--base-url <url>", "Persist a custom base URL")
        .action((apiKey: string, options: { baseUrl?: string }) => {
          saveConfig({ apiKey, baseUrl: options.baseUrl || loadConfig().baseUrl });
          printJson({
            ok: true,
            message: "Saved Metorik credentials",
            config_path: configPath(),
            api_key_url: "https://app.metorik.com/settings/stores/current?area=api"
          });
        })
    )
    .addCommand(
      new Command("logout").action(() => {
        deleteConfig();
        printJson({ ok: true, message: "Deleted stored credentials", config_path: configPath() });
      })
    )
    .addCommand(
      new Command("status").action(() => {
        const config = loadConfig();
        const envApiKey = process.env.METORIK_API_KEY;
        printJson({
          config_path: configPath(),
          has_saved_api_key: Boolean(config.apiKey),
          has_env_api_key: Boolean(envApiKey),
          effective_base_url: process.env.METORIK_BASE_URL || config.baseUrl || defaultBaseUrl
        });
      })
    );

  program
    .command("commands")
    .description("List supported Metorik endpoints")
    .action(() => {
      printJson(
        Object.values(endpoints).map((endpoint) => ({
          command: endpoint.command,
          method: endpoint.method,
          path: endpoint.path,
          required: endpoint.required ?? [],
          optional: endpoint.optional ?? [],
          enums: endpoint.enums ?? {},
          description: endpoint.description
        }))
      );
    });

  program
    .command("search")
    .description("Search Metorik resources")
    .argument("<resource>", "orders, customers, products, and more")
    .argument("<query>", "Search query")
    .option("--count <number>", "Number of results to return")
    .action(async function (resource: string, query: string, options: { count?: string }) {
      await requestJson({
        command: this,
        endpoint: endpoints.search,
        query: {
          resource,
          query,
          count: numberIfSet(options.count)
        }
      });
    });

  for (const name of ["products", "variations", "categories", "brands", "coupons"] as const) {
    const endpoint = endpoints[name];
    let command = addDateOptions(program.command(name).description(endpoint.description));
    command = addPaginationOptions(command);
    command = addSearchOption(command);
    if (endpoint.enums?.order_by) {
      command = addSortOptions(command);
    }

    command.action(async function (options: Record<string, string | undefined>) {
      await requestJson({
        command: this,
        endpoint,
        query: compactObject({
          ...parseDateRange(options),
          page: numberIfSet(options.page),
          per_page: numberIfSet(options.perPage),
          order_by: options.orderBy,
          order_dir: options.orderDir,
          search: options.search
        })
      });
    });
  }

  const reports = program.command("reports").description("Run Metorik reporting endpoints");

  for (const key of [
    "reports:customers-by-date",
    "reports:orders-by-date",
    "reports:revenue-by-date",
    "reports:profit-by-date",
    "reports:subscriptions-stats"
  ] as const) {
    const endpoint = endpoints[key];
    addDateOptions(reports.command(endpoint.command.split(" ")[1]).description(endpoint.description))
      .option("--group-by <group>", "Grouping interval")
      .action(async function (options: { startDate?: string; endDate?: string; last?: string; groupBy?: string }) {
        await requestJson({
          command: this,
          endpoint,
          query: {
            ...parseDateRange(options),
            group_by: options.groupBy
          }
        });
      });
  }

  for (const key of ["reports:revenue-grouped-by", "reports:orders-grouped-by", "reports:customers-grouped-by"] as const) {
    const endpoint = endpoints[key];
    addDateOptions(reports.command(endpoint.command.split(" ")[1]).description(endpoint.description))
      .requiredOption("--grouped-by <field>", "Field to group by")
      .action(async function (options: { startDate?: string; endDate?: string; last?: string; groupedBy: string }) {
        await requestJson({
          command: this,
          endpoint,
          query: {
            ...parseDateRange(options),
            grouped_by: options.groupedBy
          }
        });
      });
  }

  addDateOptions(reports.command("sources").description(endpoints["reports:sources"].description))
    .option("--specific <term>", "Partial domain filter")
    .action(async function (options: { startDate?: string; endDate?: string; last?: string; specific?: string }) {
      await requestJson({
        command: this,
        endpoint: endpoints["reports:sources"],
        query: {
          ...parseDateRange(options),
          specific: options.specific
        }
      });
    });

  addDateOptions(reports.command("sources-landing").description(endpoints["reports:sources-landing"].description)).action(
    async function (options: { startDate?: string; endDate?: string; last?: string }) {
      await requestJson({
        command: this,
        endpoint: endpoints["reports:sources-landing"],
        query: parseDateRange(options)
      });
    }
  );

  addDateOptions(reports.command("sources-utms").description(endpoints["reports:sources-utms"].description))
    .requiredOption("--source-type <fields>", "Comma-separated UTM fields")
    .action(async function (options: { startDate?: string; endDate?: string; last?: string; sourceType: string }) {
      await requestJson({
        command: this,
        endpoint: endpoints["reports:sources-utms"],
        query: {
          ...parseDateRange(options),
          source_type: options.sourceType
        }
      });
    });

  addDateOptions(reports.command("customer-sources").description(endpoints["reports:customer-sources"].description)).action(
    async function (options: { startDate?: string; endDate?: string; last?: string }) {
      await requestJson({
        command: this,
        endpoint: endpoints["reports:customer-sources"],
        query: parseDateRange(options)
      });
    }
  );

  addDateOptions(
    reports.command("customer-sources-landing").description(endpoints["reports:customer-sources-landing"].description)
  ).action(async function (options: { startDate?: string; endDate?: string; last?: string }) {
    await requestJson({
      command: this,
      endpoint: endpoints["reports:customer-sources-landing"],
      query: parseDateRange(options)
    });
  });

  addDateOptions(reports.command("customer-sources-utms").description(endpoints["reports:customer-sources-utms"].description))
    .requiredOption("--source-type <fields>", "Comma-separated UTM fields")
    .action(async function (options: { startDate?: string; endDate?: string; last?: string; sourceType: string }) {
      await requestJson({
        command: this,
        endpoint: endpoints["reports:customer-sources-utms"],
        query: {
          ...parseDateRange(options),
          source_type: options.sourceType
        }
      });
    });

  const engage = program.command("engage").description("Work with Engage profiles and unsubscribes");
  const profile = engage.command("profile").description("Manage Engage profiles");

  profile
    .command("upsert")
    .requiredOption("--email <email>", "Email address")
    .option("--first-name <name>", "First name")
    .option("--last-name <name>", "Last name")
    .option("--country <code>", "Country code")
    .option("--company <name>", "Company")
    .addOption(new Option("--consent <mode>", "Consent mode").choices(["single", "double"]))
    .action(
      async function (options: {
        email: string;
        firstName?: string;
        lastName?: string;
        country?: string;
        company?: string;
        consent?: string;
      }) {
        await requestJson({
          command: this,
          endpoint: endpoints["engage:profiles:upsert"],
          body: {
            email: options.email,
            first_name: options.firstName,
            last_name: options.lastName,
            country: options.country,
            company: options.company,
            consent: options.consent
          }
        });
      }
    );

  profile
    .command("delete")
    .requiredOption("--email <email>", "Email address")
    .action(async function (options: { email: string }) {
      await requestJson({
        command: this,
        endpoint: endpoints["engage:profiles:delete"],
        body: { email: options.email }
      });
    });

  const unsubscribes = engage.command("unsubscribes").description("Manage Engage unsubscribes");

  addPaginationOptions(unsubscribes.command("list").description(endpoints["engage:unsubscribes:list"].description))
    .option("--after <date>", "Only return unsubscribes after this date")
    .option("--before <date>", "Only return unsubscribes before this date")
    .addOption(new Option("--order <direction>", "Sort direction").choices(["asc", "desc"]))
    .action(
      async function (options: { after?: string; before?: string; order?: string; perPage?: string; page?: string }) {
        await requestJson({
          command: this,
          endpoint: endpoints["engage:unsubscribes:list"],
          query: {
            after: options.after,
            before: options.before,
            order: options.order,
            per_page: numberIfSet(options.perPage),
            page: numberIfSet(options.page)
          }
        });
      }
    );

  unsubscribes
    .command("status")
    .requiredOption("--email <email>", "Email address")
    .action(async function (options: { email: string }) {
      await requestJson({
        command: this,
        endpoint: endpoints["engage:unsubscribes:status"],
        query: { email: options.email }
      });
    });

  unsubscribes
    .command("add")
    .requiredOption("--email <email>", "Email address")
    .option("--reason <reason>", "Reason for unsubscribing")
    .action(async function (options: { email: string; reason?: string }) {
      await requestJson({
        command: this,
        endpoint: endpoints["engage:unsubscribes:add"],
        body: { email: options.email, reason: options.reason }
      });
    });

  unsubscribes
    .command("remove")
    .requiredOption("--email <email>", "Email address")
    .action(async function (options: { email: string }) {
      await requestJson({
        command: this,
        endpoint: endpoints["engage:unsubscribes:remove"],
        body: { email: options.email }
      });
    });

  program
    .command("request")
    .description("Call any Metorik endpoint directly")
    .argument("<method>", "GET, POST, or DELETE")
    .argument("<path>", "Path relative to /api/v1/store, like /reports/revenue-by-date")
    .option("--query <pair>", "Query parameter as key=value", collect, [])
    .option("--body <pair>", "Body field as key=value", collect, [])
    .action(async function (method: string, path: string, options: { query: string[]; body: string[] }) {
      const httpMethod = method.toUpperCase() as HttpMethod;
      if (!["GET", "POST", "DELETE"].includes(httpMethod)) {
        fail("method must be GET, POST, or DELETE");
      }

      const endpoint: Endpoint = {
        command: "request",
        method: httpMethod,
        path: path.startsWith("/") ? path : `/${path}`,
        description: "Ad hoc request"
      };

      await requestJson({
        command: this,
        endpoint,
        query: httpMethod === "GET" ? pairsToObject(options.query) : pairsToObject(options.query),
        body: httpMethod === "GET" ? undefined : pairsToObject(options.body)
      });
    });

  return program;
}

function collect(value: string, previous: string[]) {
  previous.push(value);
  return previous;
}

export function parseDateRangeForTests(options: { startDate?: string; endDate?: string; last?: string }) {
  return parseDateRange(options);
}

export function pairsToObjectForTests(items: string[]) {
  return pairsToObject(items);
}

export function endpointCatalogForTests() {
  return endpoints;
}

const isMain = (() => {
  const currentFile = fileURLToPath(import.meta.url);
  const argvFile = process.argv[1];

  if (!argvFile) {
    return false;
  }

  try {
    return realpathSync(currentFile) === realpathSync(argvFile);
  } catch {
    return currentFile === argvFile;
  }
})();

if (isMain) {
  const program = buildProgram();
  program.parseAsync(process.argv).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    fail(message);
  });
}
