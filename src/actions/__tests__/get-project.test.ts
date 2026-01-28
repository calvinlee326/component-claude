/**
 * @vitest-environment node
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

describe("getProject", () => {
  let mockPrisma: {
    project: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  let mockGetSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockPrisma = {
      project: {
        findUnique: vi.fn(),
      },
    };

    mockGetSession = vi.fn();

    vi.doMock("@/lib/prisma", () => ({
      prisma: mockPrisma,
    }));

    vi.doMock("@/lib/auth", () => ({
      getSession: mockGetSession,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("throws error when user is not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const { getProject } = await import("@/actions/get-project");

    await expect(getProject("project-123")).rejects.toThrow("Unauthorized");
  });

  test("throws error when project is not found", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const { getProject } = await import("@/actions/get-project");

    await expect(getProject("nonexistent-project")).rejects.toThrow(
      "Project not found"
    );
  });

  test("queries project with both id and userId for authorization", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const { getProject } = await import("@/actions/get-project");

    try {
      await getProject("project-456");
    } catch {
      // Expected to throw
    }

    expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
      where: {
        id: "project-456",
        userId: "user-123",
      },
    });
  });

  test("returns project with deserialized messages and data", async () => {
    const now = new Date();
    const messages = [
      { id: "msg-1", role: "user", content: "Hello" },
      { id: "msg-2", role: "assistant", content: "Hi there" },
    ];
    const data = {
      "/App.jsx": { type: "file", content: "code" },
    };

    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "project-123",
      name: "My Project",
      userId: "user-123",
      messages: JSON.stringify(messages),
      data: JSON.stringify(data),
      createdAt: now,
      updatedAt: now,
    });

    const { getProject } = await import("@/actions/get-project");

    const result = await getProject("project-123");

    expect(result).toEqual({
      id: "project-123",
      name: "My Project",
      messages,
      data,
      createdAt: now,
      updatedAt: now,
    });
  });

  test("correctly parses empty messages and data", async () => {
    const now = new Date();
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "project-123",
      name: "Empty Project",
      userId: "user-123",
      messages: "[]",
      data: "{}",
      createdAt: now,
      updatedAt: now,
    });

    const { getProject } = await import("@/actions/get-project");

    const result = await getProject("project-123");

    expect(result.messages).toEqual([]);
    expect(result.data).toEqual({});
  });

  test("returns project with complex nested data", async () => {
    const now = new Date();
    const complexData = {
      "/": { type: "directory", name: "/", path: "/" },
      "/components": { type: "directory", name: "components", path: "/components" },
      "/components/Button.tsx": {
        type: "file",
        name: "Button.tsx",
        path: "/components/Button.tsx",
        content: "export const Button = () => <button>Click</button>;",
      },
    };

    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "project-123",
      name: "Complex Project",
      userId: "user-123",
      messages: "[]",
      data: JSON.stringify(complexData),
      createdAt: now,
      updatedAt: now,
    });

    const { getProject } = await import("@/actions/get-project");

    const result = await getProject("project-123");

    expect(result.data).toEqual(complexData);
    expect(result.data["/components/Button.tsx"].content).toContain("Button");
  });

  test("prevents access to other user's projects", async () => {
    // User is authenticated as user-123
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    // Project belongs to user-456, so findUnique returns null
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const { getProject } = await import("@/actions/get-project");

    // Should throw "Project not found" because the where clause includes userId
    await expect(getProject("other-user-project")).rejects.toThrow(
      "Project not found"
    );
  });
});
