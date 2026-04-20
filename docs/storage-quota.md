# Storage Quota

Operators can cap how much file storage the instance uses. Without a limit, uploads are accepted until the underlying disk fills up.

## How it works

`STORAGE_LIMIT_GB` sets a per-instance ceiling in gigabytes. Every file upload checks total usage across asset attachments and service-record attachments before accepting the file. If the upload would exceed the limit, the server rejects it with a `STORAGE_QUOTA_EXCEEDED` error.

When the variable is unset or empty, quota enforcement is skipped entirely.

## Configuration

Set `STORAGE_LIMIT_GB` on the Next.js process (the server that enforces the check). In `docker-compose.yml` that's the `app` service:

```yaml
environment:
  STORAGE_LIMIT_GB: 15
```

Any positive number works — decimals too (e.g., `0.5` for 500 MB). Unset to disable the cap.

## What counts

The quota sums file sizes from two PocketBase collections:

- **asset attachments** — uses the optimized size when available, otherwise the original upload size. Failed attachments (whose underlying file has been cleaned up) are excluded.
- **service-record attachments** — uses the stored file size.

Both are checked on every upload. The incoming file's size is added to the current total before comparing against the limit.

## Frontend behavior

When a limit is configured, the asset attachment upload zone displays a usage bar. The bar turns red when storage is full, and uploads are blocked client-side as well as server-side. Users who hit the limit see: *"Storage limit reached. Delete files to free up space."*

When no limit is set, the usage bar is hidden.
