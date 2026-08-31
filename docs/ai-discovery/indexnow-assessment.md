# IndexNow assessment — AEO-06

Classification: `INDEXNOW_OPTIONAL`

Recorded 2026-08-31.

## Evidence

- No IndexNow implementation reference, key-file reference, or submission
  evidence was found in the repository search.
- No IndexNow key file was added or requested in this workstream.
- The live sitemap is healthy at `https://pcgsoft.co.uk/sitemap.xml` and lists
  31 routes.
- The portfolio is a low-frequency static project hub. Its current update
  pattern does not justify an automatic notification implementation as a
  prerequisite for this setup.

## Decision

IndexNow may be useful later for prompt notification of changed or deleted
URLs, particularly for Bing and other participating engines, but it is not
required to complete this measurement setup. The existing sitemap and the
robots sitemap directive provide a standard discovery path. IndexNow would not
prove that a URL is indexed, selected, or cited.

The official protocol requires a host-ownership key file and supports single
URL or bulk submissions. A successful HTTP response means the URL was received,
not that it was indexed. See the [IndexNow documentation](https://www.indexnow.org/documentation)
and [IndexNow FAQ](https://www.indexnow.org/faq).

## Deferred implementation boundary

If the operator later chooses `INDEXNOW_RECOMMENDED`, implementation would need
explicit approval for a production source/deployment change. The safe design
would include:

1. Generate and protect an IndexNow key.
2. Host the UTF-8 key file at the site root (or use an explicitly scoped
   `keyLocation`).
3. Submit only added, updated, or deleted canonical URLs after a successful
   production deployment, with deduplication and rate control.
4. Record response codes and the key-file verification result.
5. Recheck the Bing/Webmaster evidence separately; do not treat notification as
   an indexing result.

No key file, client code, build hook, DNS record, or deployment configuration
was changed by AEO-06.
