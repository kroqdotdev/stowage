# Storage Quota

When Stowage runs as a hosted service, operators can cap how much file storage each tenant uses. Self-hosted deployments have no limit by default.

## How It Works

The `STORAGE_LIMIT_GB` environment variable sets a per-instance ceiling in gigabytes. Every file upload checks total usage across asset attachments and service record attachments before accepting the file. If the upload would exceed the limit, the server rejects it with a `STORAGE_QUOTA_EXCEEDED` error.

When the variable is unset or empty, quota enforcement is skipped entirely.

## Setup

Set the limit in your Convex deployment:

```bash
npx convex env set STORAGE_LIMIT_GB 15
```

This caps storage at 15 GB. Use any positive number — decimals work too (e.g., `0.5` for 500 MB).

To remove the limit:

```bash
npx convex env unset STORAGE_LIMIT_GB
```

## What Counts Toward the Quota

The quota sums file sizes from two tables:

- **Asset attachments** — uses the optimized size when available, otherwise the original upload size. Failed attachments (whose storage has been cleaned up) are excluded.
- **Service record attachments** — uses the stored file size.

Both tables are checked on every upload. The incoming file's size is added to the current total before comparing against the limit.

## Frontend Behavior

When a limit is configured, the asset attachment upload zone displays a storage usage bar showing current usage against the cap. The bar turns red when storage is full.

Users who hit the limit see: *"Storage limit reached. Delete files to free up space."* Uploads are blocked client-side and rejected server-side.

When no limit is set, the usage bar does not appear.

## API

### `storage_quota.getStorageUsage` (query)

Returns current usage and the configured limit. Requires authentication.

**Response:**

```json
{
  "usedBytes": 1073741824,
  "limitBytes": 16106127360
}
```

`limitBytes` is `null` when no limit is configured.

## Self-Hosted Instances

Self-hosted deployments need no configuration. Without `STORAGE_LIMIT_GB`, there is no quota — storage grows with whatever the Convex plan allows.
