import { z } from 'astro/zod';
import defaults from '../brand/defaults.json';

/**
 * Brand content owned by franchise HQ, not by individual clinics.
 *
 * Clinics control their own local details through their CMS — name, address,
 * hours, doctors, scheduling, tracking. The values here are the opposite: one
 * organisation-wide source that HQ changes once and every clinic picks up on
 * its next build.
 *
 * Fetched at build time from BRAND_URL. If that is unset or unreachable the
 * bundled defaults are used instead, so a problem at HQ can never break a
 * clinic's build — the site just keeps the last-known brand values that
 * shipped with the template.
 */
const pillarSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const stepSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export const brandSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  logo: z.string(),
  network: z.object({
    label: z.string(),
    claim: z.string(),
    trustItem: z.string(),
    footerLine: z.string(),
  }),
  theme: z.object({
    green: z.string(),
    greenDark: z.string(),
    dark: z.string(),
    black: z.string(),
    offWhite: z.string(),
    fontDisplay: z.string(),
    fontBody: z.string(),
  }),
  pillarsHeading: z.string(),
  pillars: z.array(pillarSchema),
  trustItems: z.array(z.string()),
  firstVisitSteps: z.array(stepSchema),
});

export type Brand = z.infer<typeof brandSchema>;

const fallback: Brand = brandSchema.parse(defaults);

// Build-time memo: every page imports this, and HQ should be fetched once.
let cached: Brand | null = null;

export async function getBrand(): Promise<Brand> {
  if (cached) return cached;

  // Set per site in Netlify. Once the brand site has a stable address this
  // should become the default here, so launching a clinic needs no brand config
  // at all and HQ is opt-out rather than opt-in.
  const url = (process.env.BRAND_URL ?? '').trim();

  if (!url) {
    cached = fallback;
    return cached;
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const parsed = brandSchema.safeParse(await res.json());
    if (!parsed.success) {
      // Loud, but still builds. A malformed brand feed must not take 66
      // clinic sites offline.
      console.warn(
        `[brand] ${url} returned data that does not match the schema; using bundled defaults.\n` +
          parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
      );
      cached = fallback;
      return cached;
    }

    console.log(`[brand] loaded from ${url}`);
    cached = parsed.data;
    return cached;
  } catch (error) {
    console.warn(
      `[brand] could not load ${url} (${error instanceof Error ? error.message : error}); using bundled defaults.`
    );
    cached = fallback;
    return cached;
  }
}

/**
 * Brand colours and fonts as a CSS custom-property block.
 *
 * Selector is `:root:root` rather than `:root` deliberately. Astro decides
 * where component styles land in the head and it puts this *before*
 * global.css, so matching specificity would lose and the template's palette
 * would win. Doubling the selector makes HQ's values take precedence
 * regardless of source order.
 */
export function brandThemeCss(brand: Brand): string {
  const t = brand.theme;
  return [
    ':root:root{',
    `--green:${t.green};`,
    `--green-dark:${t.greenDark};`,
    `--dark:${t.dark};`,
    `--black:${t.black};`,
    `--off-white:${t.offWhite};`,
    `--font-display:${t.fontDisplay};`,
    `--font-body:${t.fontBody};`,
    '}',
  ].join('');
}
