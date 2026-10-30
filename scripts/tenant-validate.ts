import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { TenantConfigSchema } from '../src/types/tenant.js';

async function validateTenant(slug: string) {
  if (!slug) {
    console.error('\x1b[31m[ERROR] Please specify tenant slug to validate. Example: pnpm tenant:validate apex-detailing\x1b[0m');
    process.exit(1);
  }

  const tenantDir = path.resolve(process.cwd(), 'tenants', slug);
  if (!fs.existsSync(tenantDir)) {
    console.error(`\x1b[31m[ERROR] Tenant directory not found: ${tenantDir}\x1b[0m`);
    process.exit(1);
  }

  const configPath = path.join(tenantDir, 'config.ts');
  if (!fs.existsSync(configPath)) {
    console.error(`\x1b[31m[ERROR] config.ts not found in ${tenantDir}\x1b[0m`);
    process.exit(1);
  }

  console.log(`\x1b[34m[VALIDATION]\x1b[0m Inspecting tenant "${slug}"...`);

  try {
    const configModule = await import(pathToFileURL(configPath).href);
    const configKey = Object.keys(configModule).find(k => k.includes('config') || k.includes('Config'));
    const config = configKey ? configModule[configKey] : Object.values(configModule)[0];

    if (!config) {
      throw new Error('No config export found in config.ts');
    }

    // 1. Zod Validation
    const parsed = TenantConfigSchema.parse(config);
    console.log('  \x1b[32m✓\x1b[0m Zod schema valid');

    // 2. Working hours interval check
    const [openH, openM] = parsed.openingHour.split(':').map(Number);
    const [closeH, closeM] = parsed.closingHour.split(':').map(Number);
    const openTotal = openH * 60 + openM;
    const closeTotal = closeH * 60 + closeM;

    if (closeTotal <= openTotal) {
      throw new Error(`closingHour (${parsed.closingHour}) must be strictly after openingHour (${parsed.openingHour})`);
    }
    console.log(`  \x1b[32m✓\x1b[0m Working hours logical (${parsed.openingHour} - ${parsed.closingHour})`);

    // 3. Check assets
    const logoPath = path.join(tenantDir, 'assets', 'logo.svg');
    if (!fs.existsSync(logoPath)) {
      console.warn('  \x1b[33m⚠ Warning:\x1b[0m logo.svg is missing in assets/ folder');
    } else {
      console.log('  \x1b[32m✓\x1b[0m logo.svg present');
    }

    console.log(`\n\x1b[32m[PASS] Tenant "${slug}" is verified and production ready.\x1b[0m\n`);
    return true;
  } catch (err: any) {
    console.error(`\n\x1b[31m[FAILED] Tenant "${slug}" validation error:\x1b[0m`, err.message || err);
    if (err.errors) {
      console.error(JSON.stringify(err.errors, null, 2));
    }
    process.exit(1);
  }
}

const targetSlug = process.argv[2];
validateTenant(targetSlug);
