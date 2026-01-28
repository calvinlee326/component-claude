/**
 * @vitest-environment node
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  let mockCookieStore: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();

    mockCookieStore = {
      set: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };

    vi.doMock("next/headers", () => ({
      cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("creates a session with valid JWT token", async () => {
    const { createSession } = await import("@/lib/auth");

    await createSession("user-123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);

    const [cookieName, token] = mockCookieStore.set.mock.calls[0];

    expect(cookieName).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });

  test("sets cookie with correct options", async () => {
    const { createSession } = await import("@/lib/auth");

    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];

    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toBeInstanceOf(Date);
  });

  test("sets cookie expiration to 7 days from now", async () => {
    const { createSession } = await import("@/lib/auth");

    const beforeCall = Date.now();
    await createSession("user-123", "test@example.com");
    const afterCall = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expiresTime = options.expires.getTime();

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresTime).toBeGreaterThanOrEqual(beforeCall + sevenDaysMs);
    expect(expiresTime).toBeLessThanOrEqual(afterCall + sevenDaysMs);
  });

  test("creates JWT with correct payload containing userId and email", async () => {
    const { createSession } = await import("@/lib/auth");

    await createSession("user-456", "user@test.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-456");
    expect(payload.email).toBe("user@test.com");
  });

  test("creates JWT with expiration claim", async () => {
    const { createSession } = await import("@/lib/auth");

    await createSession("user-789", "another@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.exp).toBeDefined();
    expect(typeof payload.exp).toBe("number");
  });

  test("creates JWT with issued at claim", async () => {
    const { createSession } = await import("@/lib/auth");

    const beforeCall = Math.floor(Date.now() / 1000);
    await createSession("user-abc", "abc@example.com");
    const afterCall = Math.floor(Date.now() / 1000);

    const [, token] = mockCookieStore.set.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.iat).toBeDefined();
    expect(payload.iat).toBeGreaterThanOrEqual(beforeCall);
    expect(payload.iat).toBeLessThanOrEqual(afterCall);
  });

  test("handles different user IDs correctly", async () => {
    const { createSession } = await import("@/lib/auth");

    await createSession("uuid-12345-abcde", "first@example.com");
    const [, token1] = mockCookieStore.set.mock.calls[0];

    await createSession("uuid-67890-fghij", "second@example.com");
    const [, token2] = mockCookieStore.set.mock.calls[1];

    expect(token1).not.toBe(token2);

    const { payload: payload1 } = await jwtVerify(token1, JWT_SECRET);
    const { payload: payload2 } = await jwtVerify(token2, JWT_SECRET);

    expect(payload1.userId).toBe("uuid-12345-abcde");
    expect(payload2.userId).toBe("uuid-67890-fghij");
  });

  test("does not set secure cookie in development environment", async () => {
    const { createSession } = await import("@/lib/auth");

    await createSession("user-dev", "dev@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(false);
  });
});

describe("getSession", () => {
  let mockCookieStore: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();

    mockCookieStore = {
      set: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };

    vi.doMock("next/headers", () => ({
      cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when no token cookie exists", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
    expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
  });

  test("returns null when token cookie value is undefined", async () => {
    mockCookieStore.get.mockReturnValue({ value: undefined });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns session payload for valid token", async () => {
    const { createSession, getSession } = await import("@/lib/auth");

    await createSession("user-123", "test@example.com");
    const [, token] = mockCookieStore.set.mock.calls[0];

    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null for invalid token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid-token" });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for malformed JWT", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt.token" });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for token signed with different secret", async () => {
    const { SignJWT } = await import("jose");
    const wrongSecret = new TextEncoder().encode("wrong-secret-key");

    const token = await new SignJWT({ userId: "user-123", email: "test@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(wrongSecret);

    mockCookieStore.get.mockReturnValue({ value: token });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns session with expiresAt from payload", async () => {
    const { createSession, getSession } = await import("@/lib/auth");

    await createSession("user-456", "user@test.com");
    const [, token] = mockCookieStore.set.mock.calls[0];

    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.expiresAt).toBeDefined();
  });
});
