/**
 * @vitest-environment node
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

describe("createProject", () => {
  let mockPrisma: {
    project: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  let mockGetSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockPrisma = {
      project: {
        create: vi.fn(),
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

    const { createProject } = await import("@/actions/create-project");

    await expect(
      createProject({
        name: "Test Project",
        messages: [],
        data: {},
      })
    ).rejects.toThrow("Unauthorized");
  });

  test("creates project with serialized messages and data", async () => {
    const now = new Date();
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.create.mockResolvedValue({
      id: "project-123",
      name: "Test Project",
      userId: "user-123",
      messages: "[]",
      data: "{}",
      createdAt: now,
      updatedAt: now,
    });

    const { createProject } = await import("@/actions/create-project");

    const result = await createProject({
      name: "Test Project",
      messages: [],
      data: {},
    });

    expect(mockPrisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Test Project",
        userId: "user-123",
        messages: "[]",
        data: "{}",
      },
    });
    expect(result.id).toBe("project-123");
  });

  test("serializes complex messages correctly", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.create.mockResolvedValue({
      id: "project-123",
      name: "My Design",
      userId: "user-123",
      messages: "serialized",
      data: "serialized",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const messages = [
      { id: "msg-1", role: "user", content: "Create a button" },
      {
        id: "msg-2",
        role: "assistant",
        content: "Creating button...",
        toolInvocations: [
          { toolName: "str_replace_editor", args: { command: "create" } },
        ],
      },
    ];

    const { createProject } = await import("@/actions/create-project");

    await createProject({
      name: "My Design",
      messages,
      data: { "/App.jsx": "code" },
    });

    expect(mockPrisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "My Design",
        userId: "user-123",
        messages: JSON.stringify(messages),
        data: JSON.stringify({ "/App.jsx": "code" }),
      },
    });
  });

  test("serializes complex file system data correctly", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.create.mockResolvedValue({
      id: "project-123",
      name: "Project",
      userId: "user-123",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const fileSystemData = {
      "/": { type: "directory", name: "/", path: "/" },
      "/App.jsx": {
        type: "file",
        name: "App.jsx",
        path: "/App.jsx",
        content: "export default function App() { return <div>Hello</div>; }",
      },
      "/components": { type: "directory", name: "components", path: "/components" },
      "/components/Button.jsx": {
        type: "file",
        name: "Button.jsx",
        path: "/components/Button.jsx",
        content: "export const Button = () => <button>Click</button>;",
      },
    };

    const { createProject } = await import("@/actions/create-project");

    await createProject({
      name: "Project",
      messages: [],
      data: fileSystemData,
    });

    expect(mockPrisma.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        data: JSON.stringify(fileSystemData),
      }),
    });
  });

  test("returns the created project", async () => {
    const now = new Date();
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });

    const createdProject = {
      id: "project-456",
      name: "New Project",
      userId: "user-123",
      messages: "[]",
      data: "{}",
      createdAt: now,
      updatedAt: now,
    };
    mockPrisma.project.create.mockResolvedValue(createdProject);

    const { createProject } = await import("@/actions/create-project");

    const result = await createProject({
      name: "New Project",
      messages: [],
      data: {},
    });

    expect(result).toEqual(createdProject);
  });

  test("propagates database errors", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
    });
    mockPrisma.project.create.mockRejectedValue(new Error("Database error"));

    const { createProject } = await import("@/actions/create-project");

    await expect(
      createProject({
        name: "Test",
        messages: [],
        data: {},
      })
    ).rejects.toThrow("Database error");
  });
});
