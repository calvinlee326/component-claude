/**
 * @vitest-environment node
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

describe("middleware", () => {
  let mockVerifySession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockVerifySession = vi.fn();

    vi.doMock("@/lib/auth", () => ({
      verifySession: mockVerifySession,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("allows non-protected routes without authentication", async () => {
    mockVerifySession.mockResolvedValue(null);

    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/");
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  test("allows access to /api/chat without authentication", async () => {
    mockVerifySession.mockResolvedValue(null);

    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/api/chat");
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  test("returns 401 for /api/projects without authentication", async () => {
    mockVerifySession.mockResolvedValue(null);

    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/api/projects");
    const response = await middleware(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  test("returns 401 for /api/projects/123 without authentication", async () => {
    mockVerifySession.mockResolvedValue(null);

    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/api/projects/123");
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  test("returns 401 for /api/filesystem without authentication", async () => {
    mockVerifySession.mockResolvedValue(null);

    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/api/filesystem");
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  test("returns 401 for /api/filesystem/save without authentication", async () => {
    mockVerifySession.mockResolvedValue(null);

    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/api/filesystem/save");
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  test("allows /api/projects with valid session", async () => {
    mockVerifySession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });

    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/api/projects");
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  test("allows /api/filesystem with valid session", async () => {
    mockVerifySession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });

    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/api/filesystem");
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  test("passes request to verifySession", async () => {
    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/api/projects");
    await middleware(request);

    expect(mockVerifySession).toHaveBeenCalledWith(request);
  });

  test("allows static file paths", async () => {
    mockVerifySession.mockResolvedValue(null);

    const { middleware } = await import("@/middleware");

    // This won't be matched by middleware due to config.matcher
    // but if it was, it should pass
    const request = new NextRequest("http://localhost:3000/_next/static/chunk.js");
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  test("allows page routes without authentication", async () => {
    mockVerifySession.mockResolvedValue(null);

    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/some-project-id");
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });
});

describe("middleware config", () => {
  test("exports matcher configuration", async () => {
    const { config } = await import("@/middleware");

    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
  });

  test("matcher excludes static files", async () => {
    const { config } = await import("@/middleware");

    const matcher = config.matcher[0];
    expect(matcher).toContain("_next/static");
    expect(matcher).toContain("_next/image");
    expect(matcher).toContain("favicon.ico");
  });

  test("matcher excludes image files", async () => {
    const { config } = await import("@/middleware");

    const matcher = config.matcher[0];
    expect(matcher).toContain("svg");
    expect(matcher).toContain("png");
    expect(matcher).toContain("jpg");
    expect(matcher).toContain("jpeg");
    expect(matcher).toContain("gif");
    expect(matcher).toContain("webp");
  });
});
