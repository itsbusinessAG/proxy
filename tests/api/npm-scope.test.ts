import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  parseNpmSpec,
  getProxiedPackument,
  resolveOriginalTarball,
} from "../../app/api/tmgmt/lib/npm-registry";

// The npm proxy serves exactly one scope: @itsbusinessag/* (GitHub Packages,
// itsbusinessAG org). The old @meintest scope has been fully removed — it is now
// rejected like any other foreign scope, so the proxy can never become an open
// mirror.

describe("parseNpmSpec — scope allowlist", () => {
  test("packument in the served scope → packument", () => {
    assert.deepEqual(parseNpmSpec("@itsbusinessag/cc-testframework"), {
      kind: "packument",
      scope: "@itsbusinessag",
      pkg: "cc-testframework",
    });
  });

  test("tarball in the served scope → tarball with scope + pkg + filename", () => {
    assert.deepEqual(parseNpmSpec("@itsbusinessag/cc-testframework-authoring/-/deadbeef"), {
      kind: "tarball",
      scope: "@itsbusinessag",
      pkg: "cc-testframework-authoring",
      filename: "deadbeef",
    });
  });

  test("the removed @meintest scope is now rejected (→403)", () => {
    assert.deepEqual(parseNpmSpec("@meintest/cc-testframework"), { kind: "reject" });
    assert.deepEqual(parseNpmSpec("@meintest/cc-testframework/-/abc123"), { kind: "reject" });
  });

  test("any other scope → reject (→403, never an open mirror)", () => {
    for (const spec of ["@foo/bar", "@npm/thing", "@itsbusiness/x", "@itsbusinessagx/y"]) {
      assert.deepEqual(parseNpmSpec(spec), { kind: "reject" }, spec);
    }
  });

  test("allowed scope but unrecognized shape → not-found (→404, not 403)", () => {
    assert.deepEqual(parseNpmSpec("@itsbusinessag/pkg/extra/segment"), { kind: "not-found" });
    assert.deepEqual(parseNpmSpec("@itsbusinessag/"), { kind: "not-found" });
  });
});

describe("upstream resolution + cache", () => {
  const realFetch = globalThis.fetch;
  let calls: string[];

  function packument() {
    return {
      "dist-tags": { latest: "1.0.0" },
      versions: { "1.0.0": { dist: { tarball: "https://gh/x/-/sha0" } } },
    };
  }

  beforeEach(() => {
    calls = [];
    process.env.GH_PACKAGES_TOKEN = "test-pat"; // avoid the GitHub App path
    globalThis.fetch = (async (url: string | URL | Request) => {
      calls.push(String(url));
      return new Response(JSON.stringify(packument()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.GH_PACKAGES_TOKEN;
  });

  test("the served scope is carried verbatim into the upstream path", async () => {
    await getProxiedPackument("@itsbusinessag", "probe-path", "https://app.itsbusiness.ch/api/tmgmt/npm", false);
    assert.match(calls[0], /npm\.pkg\.github\.com\/@itsbusinessag%2fprobe-path$/);
  });

  test("packument tarball URLs are rewritten under the served scope", async () => {
    const p = (await getProxiedPackument(
      "@itsbusinessag",
      "probe-rewrite",
      "https://app.itsbusiness.ch/api/tmgmt/npm",
      false,
    )) as { versions: Record<string, { dist: { tarball: string } }> };
    assert.equal(
      p.versions["1.0.0"].dist.tarball,
      "https://app.itsbusiness.ch/api/tmgmt/npm/@itsbusinessag/probe-rewrite/-/sha0",
    );
  });

  test("a warm scope is served from cache (same scope+pkg → one upstream call)", async () => {
    await getProxiedPackument("@itsbusinessag", "probe-warm", "base", false);
    await getProxiedPackument("@itsbusinessag", "probe-warm", "base", false);
    assert.equal(calls.length, 1, "second identical request is cached");
  });

  test("rc filtering (#31): a customer gets forbidden for a pre-release tarball", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      calls.push(String(url));
      return new Response(
        JSON.stringify({
          versions: { "1.1.0-rc.1": { dist: { tarball: "https://gh/x/-/rcsha" } } },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
    const r = await resolveOriginalTarball("@itsbusinessag", "probe-rc", "rcsha", false);
    assert.deepEqual(r, { kind: "forbidden" });
    const ok = await resolveOriginalTarball("@itsbusinessag", "probe-rc", "rcsha", true);
    assert.equal(ok.kind, "ok");
  });
});
