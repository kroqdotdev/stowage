# SaaS Provisioning Guide

When Stowage runs as a hosted service, a registration portal provisions each tenant's admin account automatically. Tenants never see the `/setup` page.

## How It Works

The `/api/provision` HTTP endpoint creates the first admin user for a new instance. It accepts a JSON payload with the admin's credentials, authenticated by a shared secret.

The endpoint is idempotent. If the admin account already exists with the same email, it returns success rather than an error.

## Setup

Set the `PROVISION_SECRET` environment variable in your Convex deployment:

```bash
npx convex env set PROVISION_SECRET "your-secret-here"
```

Use a strong random value (32+ characters). This secret authenticates requests from your registration portal.

## API Reference

### `POST /api/provision`

Creates the first admin user for the instance.

**Headers:**

```
Authorization: Bearer <PROVISION_SECRET>
Content-Type: application/json
```

**Request body:**

```json
{
  "email": "admin@example.com",
  "name": "Alex Morgan",
  "password": "a-strong-password"
}
```

All three fields are required. The password must be at least 8 characters.

**Responses:**

| Status | Meaning | Body |
|--------|---------|------|
| 201 | Admin created | `{ "status": "provisioned", "userId": "..." }` |
| 200 | Admin already exists with this email | `{ "status": "already_provisioned", "userId": "..." }` |
| 400 | Missing fields or invalid JSON | `{ "error": "..." }` |
| 401 | Wrong or missing secret | `{ "error": "Unauthorized" }` |
| 409 | Instance has a different admin | `{ "error": "Instance already provisioned with a different admin" }` |
| 503 | `PROVISION_SECRET` not set | `{ "error": "Provisioning is not configured" }` |

## Example

```bash
curl -X POST https://your-convex-deployment.convex.site/api/provision \
  -H "Authorization: Bearer your-secret-here" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@acme.com", "name": "Jane Smith", "password": "s3cure-pa55word"}'
```

## Self-Hosted Instances

Self-hosted deployments still use the `/setup` page as before. The provisioning endpoint remains dormant unless `PROVISION_SECRET` is set. Without the secret, requests receive a `503` response.
