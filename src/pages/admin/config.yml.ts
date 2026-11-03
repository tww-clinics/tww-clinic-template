import type { APIRoute } from 'astro';
// The collections are authored as plain YAML and pasted in verbatim below.
// Only the backend block is generated, because only it differs per clinic.
import collections from '../../cms/collections.yml?raw';

export const prerender = true;

/**
 * Serves /admin/config.yml.
 *
 * Every clinic runs the same template against a different repo and a different
 * DecapBridge site, so hardcoding a config.yml would mean hand-editing it for
 * each one. Both values are available at build time instead:
 *
 *   REPOSITORY_URL   set automatically by Netlify, e.g.
 *                    https://github.com/tww-clinics/tww-appleton
 *   DECAP_SITE_ID    set once per site in Netlify's environment variables,
 *                    from the site you create at decapbridge.com
 *
 * So a new clinic needs no code changes at all — just the env var.
 */
export const GET: APIRoute = () => {
  const repoUrl = process.env.REPOSITORY_URL ?? '';
  // Accepts https://github.com/owner/repo(.git) and git@github.com:owner/repo.git
  const repo = repoUrl
    .replace(/^.*github\.com[/:]/, '')
    .replace(/\.git$/, '')
    .trim();

  const siteId = (process.env.DECAP_SITE_ID ?? '').trim();
  const siteUrl = process.env.URL ?? 'http://localhost:4321';

  // Fail loudly and legibly. An invalid backend block would surface in the CMS
  // as an opaque error; a comment in the served file says exactly what is wrong.
  const problems: string[] = [];
  if (!repo) problems.push('REPOSITORY_URL was not set at build time, so the repo could not be determined.');
  if (!siteId) problems.push('DECAP_SITE_ID is not set. Create a site at decapbridge.com, then add its id as an environment variable in Netlify and redeploy.');

  const header = problems.length
    ? `# ⚠️  THIS CMS IS NOT CONFIGURED\n${problems.map((p) => `#   - ${p}`).join('\n')}\n#\n`
    : '';

  const backend = `${header}# Auth is handled by DecapBridge, not Netlify Git Gateway, which Netlify has
# deprecated. The repository is named explicitly so the CMS can never drift
# onto the wrong repo the way the Netlify-hosted gateway silently could.
# Generated at build time — see src/pages/admin/config.yml.ts
backend:
  name: git-gateway
  repo: ${repo || 'UNKNOWN/UNKNOWN'}
  branch: main
  auth_type: pkce
  base_url: https://auth.decapbridge.com
  auth_endpoint: /sites/${siteId || 'DECAP_SITE_ID_NOT_SET'}/pkce
  auth_token_endpoint: /sites/${siteId || 'DECAP_SITE_ID_NOT_SET'}/token
  gateway_url: https://gateway.decapbridge.com

  # Attribute each CMS commit to the staff member who made it.
  commit_messages:
    create: Create {{collection}} “{{slug}}” - {{author-name}} <{{author-login}}> via DecapBridge
    update: Update {{collection}} “{{slug}}” - {{author-name}} <{{author-login}}> via DecapBridge
    delete: Delete {{collection}} “{{slug}}” - {{author-name}} <{{author-login}}> via DecapBridge
    uploadMedia: Upload “{{path}}” - {{author-name}} <{{author-login}}> via DecapBridge
    deleteMedia: Delete “{{path}}” - {{author-name}} <{{author-login}}> via DecapBridge
    openAuthoring: Message {{message}} - {{author-name}} <{{author-login}}> via DecapBridge

# Claims DecapBridge returns, used for the attribution above.
auth:
  email_claim: email
  first_name_claim: first_name
  last_name_claim: last_name
  avatar_url_claim: avatar_url

logo_url: https://decapbridge.com/decapcms-with-bridge.svg
site_url: ${siteUrl}

`;

  return new Response(backend + collections, {
    headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
  });
};
