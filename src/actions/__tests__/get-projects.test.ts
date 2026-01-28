/**
 * @vitest-environment node
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

describe("getProjects", () => {
  let mockPrisma: {
    project: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  let mockGetSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockPrisma = {
      project: {
        findMany: vi.fn(),
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

    const { getProjects } = await import("@/actions/get-projects");

    await expect(getProjects()).rejects.toThrow("Unauthorized");
  });

  test("returns empty array when user has no projects", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findMany.mockResolvedValue([]);

    const { getProjects } = await import("@/actions/get-projects");

    const result = await getProjects();

    expect(result).toEqual([]);
  });

  test("returns projects for authenticated user", async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: "project-1",
        name: "Recent Project",
        createdAt: yesterday,
        updatedAt: now,
      },
      {
        id: "project-2",
        name: "Older Project",
        createdAt: yesterday,
        updatedAt: yesterday,
      },
    ]);

    const { getProjects } = await import("@/actions/get-projects");

    const result = await getProjects();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Recent Project");
    expect(result[1].name).toBe("Older Project");
  });

  test("queries with correct parameters", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findMany.mockResolvedValue([]);

    const { getProjects } = await import("@/actions/get-projects");

    await getProjects();

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  test("orders projects by updatedAt descending (most recent first)", async () => {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findMany.mockResolvedValue([
      { id: "1", name: "Most Recent", createdAt: dayAgo, updatedAt: now },
      { id: "2", name: "Hour Ago", createdAt: dayAgo, updatedAt: hourAgo },
      { id: "3", name: "Day Ago", createdAt: dayAgo, updatedAt: dayAgo },
    ]);

    const { getProjects } = await import("@/actions/get-projects");

    const result = await getProjects();

    expect(result[0].name).toBe("Most Recent");
    expect(result[1].name).toBe("Hour Ago");
    expect(result[2].name).toBe("Day Ago");
  });

  test("only returns essential fields (not messages or data)", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: "project-1",
        name: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const { getProjects } = await import("@/actions/get-projects");

    const result = await getProjects();

    // Verify the select clause only includes these fields
    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    );

    // Result should only have these fields
    const project = result[0];
    expect(Object.keys(project).sort()).toEqual([
      "createdAt",
      "id",
      "name",
      "updatedAt",
    ]);
  });

  test("filters projects by current user only", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findMany.mockResolvedValue([]);

    const { getProjects } = await import("@/actions/get-projects");

    await getProjects();

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-123",
        },
      })
    );
  });

  test("propagates database errors", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.findMany.mockRejectedValue(new Error("Database error"));

    const { getProjects } = await import("@/actions/get-projects");

    await expect(getProjects()).rejects.toThrow("Database error");
  });
});
