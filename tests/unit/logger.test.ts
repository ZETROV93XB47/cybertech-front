// @vitest-environment node
import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { LogLevel } from "@/lib/enums/log-level";
import { maskEmail, maskUuid } from "@/lib/log-safety";
import { createLogger, REDACTION_CENSOR } from "@/lib/logger";

/** Collects every JSON line written by a logger. */
function memoryStream(): { stream: Writable; lines: () => Record<string, unknown>[] } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return {
    stream,
    lines: () => chunks.map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}

describe("maskUuid", () => {
  it("keeps the first 8 characters", () => {
    expect(maskUuid("0193a2b4-1111-2222-3333-444455556666")).toBe("0193a2b4***");
  });

  it("masks missing values", () => {
    expect(maskUuid(undefined)).toBe("***");
    expect(maskUuid("")).toBe("***");
  });
});

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(maskEmail("jane.doe@example.com")).toBe("j***@example.com");
  });

  it("masks values that are not emails", () => {
    expect(maskEmail("not-an-email")).toBe("***");
    expect(maskEmail("@example.com")).toBe("***");
    expect(maskEmail(null)).toBe("***");
  });
});

describe("createLogger redaction", () => {
  it("never writes tokens, passwords or cookies", () => {
    const { stream, lines } = memoryStream();
    const log = createLogger({ level: LogLevel.DEBUG, pretty: false, destination: stream });

    log.info(
      {
        accessToken: "secret-access",
        session: { refreshToken: "secret-refresh", idToken: "secret-id" },
        form: { password: "hunter2" },
        headers: { authorization: "Bearer x", cookie: "a=b" },
      },
      "Sensitive payload",
    );

    const [line] = lines();
    const serialized = JSON.stringify(line);
    expect(serialized).not.toMatch(/secret-|hunter2|Bearer x|a=b/);
    expect(line?.accessToken).toBe(REDACTION_CENSOR);
  });

  it("respects the configured level", () => {
    const { stream, lines } = memoryStream();
    const log = createLogger({ level: LogLevel.WARN, pretty: false, destination: stream });
    log.info("hidden");
    log.warn("shown");
    expect(lines().map((line) => line.msg)).toEqual(["shown"]);
  });
});
