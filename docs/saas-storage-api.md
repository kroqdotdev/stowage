# SaaS Storage API

The `/api/storage` endpoint lets the registration portal query a tenant's file storage usage. Use it to display quota information on the portal dashboard.

## Setup

The endpoint shares authentication with `/api/provision`. If `PROVISION_SECRET` is already set, no additional configuration is needed.

```bash
npx convex env set PROVISION_SECRET "your-secret-here"
npx convex env set STORAGE_LIMIT_GB 15
```

## API Reference

### `GET /api/storage`

Returns the tenant's current storage usage and configured limit.

**Headers:**

```
Authorization: Bearer <PROVISION_SECRET>
```

**Response (200):**

```json
{
  "usedBytes": 3221225472,
  "limitBytes": 16106127360,
  "usedFormatted": "3.0 GB",
  "limitFormatted": "15.0 GB"
}
```

When no storage limit is configured, `limitBytes` and `limitFormatted` are `null`:

```json
{
  "usedBytes": 1048576,
  "limitBytes": null,
  "usedFormatted": "1 MB",
  "limitFormatted": null
}
```

**Error responses:**

| Status | Meaning | Body |
|--------|---------|------|
| 401 | Wrong or missing secret | `{ "error": "Unauthorized" }` |
| 405 | Wrong HTTP method | `{ "error": "Method not allowed" }` |
| 503 | `PROVISION_SECRET` not set | `{ "error": "Provisioning is not configured" }` |

## Example

```bash
curl -s https://your-convex-deployment.convex.site/api/storage \
  -H "Authorization: Bearer your-secret-here" | jq
```

## Portal Integration

A portal dashboard might poll this endpoint to show each tenant's usage:

```typescript
async function getTenantStorage(deploymentUrl: string, secret: string) {
  const response = await fetch(`${deploymentUrl}/api/storage`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  return response.json();
}
```

The response includes both raw byte counts (for calculations and progress bars) and formatted strings (for display).
