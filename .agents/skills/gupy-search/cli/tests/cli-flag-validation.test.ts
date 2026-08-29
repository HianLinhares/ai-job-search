import { describe, test, expect } from "bun:test"
import { runCLI } from "./helpers"

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr)
  } catch {
    return {}
  }
}

describe("gupy CLI flag validation", () => {
  describe("numeric flag validation", () => {
    for (const name of ["jobage", "page", "limit"]) {
      test(`--${name} non-numeric exits 1 with BAD_ARG`, async () => {
        const result = await runCLI(["search", "-q", "test", `--${name}`, "foo"])
        expect(result.exitCode).not.toBe(0)
        const err = parsedStderr(result.stderr)
        expect(err.code).toBe("BAD_ARG")
        expect(err.error).toMatch(new RegExp(name))
      })
    }

    for (const name of ["jobage", "page", "limit"]) {
      test(`--${name} fractional exits 1 with BAD_ARG instead of truncating`, async () => {
        const result = await runCLI(["search", "-q", "test", `--${name}`, "1.5"])
        expect(result.exitCode).not.toBe(0)
        const err = parsedStderr(result.stderr)
        expect(err.code).toBe("BAD_ARG")
        expect(err.error).toMatch(new RegExp(name))
      })
    }

    test("--jobage 0 exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-q", "test", "--jobage", "0"])
      expect(result.exitCode).not.toBe(0)
      expect(parsedStderr(result.stderr).code).toBe("BAD_ARG")
    })
  })

  describe("required query", () => {
    test("missing --query exits 1 with NO_QUERY", async () => {
      const result = await runCLI(["search", "--limit", "1"])
      expect(result.exitCode).toBe(1)
      expect(parsedStderr(result.stderr).code).toBe("NO_QUERY")
    })
  })

  describe("--remote validation", () => {
    test("unsupported mode exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-q", "test", "--remote", "teleport"])
      expect(result.exitCode).toBe(1)
      const err = parsedStderr(result.stderr)
      expect(err.code).toBe("BAD_ARG")
      expect(err.error).toMatch(/remote/)
    })
  })

  describe("detail argument validation", () => {
    test("missing id exits 1 with NO_ID", async () => {
      const result = await runCLI(["detail"])
      expect(result.exitCode).not.toBe(0)
      expect(parsedStderr(result.stderr).code).toBe("NO_ID")
    })

    test("an unparseable id exits 1 with BAD_ID (no network)", async () => {
      const result = await runCLI(["detail", "not a job id!"])
      expect(result.exitCode).not.toBe(0)
      expect(parsedStderr(result.stderr).code).toBe("BAD_ID")
    })
  })

  describe("command dispatch", () => {
    test("unknown command exits 1 with BAD_CMD", async () => {
      const result = await runCLI(["frobnicate"])
      expect(result.exitCode).not.toBe(0)
      expect(parsedStderr(result.stderr).code).toBe("BAD_CMD")
    })

    test("no command prints help and exits 1", async () => {
      const result = await runCLI([])
      expect(result.exitCode).toBe(1)
      expect(result.stdout).toMatch(/USAGE/)
    })
  })
})

describe("unknown flag rejection", () => {
  // Portal-skill contract: bogus flags exit 1 with UNKNOWN_FLAG on stderr —
  // never silently discarded (a discarded filter changes search results).
  test("a bogus --flag exits 1 with UNKNOWN_FLAG instead of being silently discarded", async () => {
    const result = await runCLI(["search", "--query", "test", "--bogus-flag", "xyz"])
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toBe("")
    const error = JSON.parse(result.stderr)
    expect(error.code).toBe("UNKNOWN_FLAG")
    expect(error.error).toContain("--bogus-flag")
  })
})
