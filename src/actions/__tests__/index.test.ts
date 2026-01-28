/**
 * @vitest-environment node
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock bcrypt
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn((password: string) => Promise.resolve(`hashed_${password}`)),
    compare: vi.fn((password: string, hash: string) =>
      Promise.resolve(hash === `hashed_${password}`)
    ),
  },
}));

describe("Server Actions", () => {
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };

  let mockCreateSession: ReturnType<typeof vi.fn>;
  let mockDeleteSession: ReturnType<typeof vi.fn>;
  let mockGetSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    mockCreateSession = vi.fn();
    mockDeleteSession = vi.fn();
    mockGetSession = vi.fn();

    vi.doMock("@/lib/prisma", () => ({
      prisma: mockPrisma,
    }));

    vi.doMock("@/lib/auth", () => ({
      createSession: mockCreateSession,
      deleteSession: mockDeleteSession,
      getSession: mockGetSession,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    test("returns error when email is empty", async () => {
      const { signUp } = await import("@/actions");

      const result = await signUp("", "password123");

      expect(result).toEqual({
        success: false,
        error: "Email and password are required",
      });
    });

    test("returns error when password is empty", async () => {
      const { signUp } = await import("@/actions");

      const result = await signUp("test@example.com", "");

      expect(result).toEqual({
        success: false,
        error: "Email and password are required",
      });
    });

    test("returns error when password is less than 8 characters", async () => {
      const { signUp } = await import("@/actions");

      const result = await signUp("test@example.com", "short");

      expect(result).toEqual({
        success: false,
        error: "Password must be at least 8 characters",
      });
    });

    test("returns error when email is already registered", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "existing-user-id",
        email: "test@example.com",
      });

      const { signUp } = await import("@/actions");

      const result = await signUp("test@example.com", "password123");

      expect(result).toEqual({
        success: false,
        error: "Email already registered",
      });
    });

    test("creates user with hashed password on success", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "new-user-id",
        email: "test@example.com",
      });

      const { signUp } = await import("@/actions");

      const result = await signUp("test@example.com", "password123");

      expect(result).toEqual({ success: true });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "test@example.com",
          password: "hashed_password123",
        },
      });
    });

    test("creates session after successful signup", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "new-user-id",
        email: "test@example.com",
      });

      const { signUp } = await import("@/actions");

      await signUp("test@example.com", "password123");

      expect(mockCreateSession).toHaveBeenCalledWith(
        "new-user-id",
        "test@example.com"
      );
    });

    test("returns error when database operation fails", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("DB Error"));

      const { signUp } = await import("@/actions");

      const result = await signUp("test@example.com", "password123");

      expect(result).toEqual({
        success: false,
        error: "An error occurred during sign up",
      });
    });
  });

  describe("signIn", () => {
    test("returns error when email is empty", async () => {
      const { signIn } = await import("@/actions");

      const result = await signIn("", "password123");

      expect(result).toEqual({
        success: false,
        error: "Email and password are required",
      });
    });

    test("returns error when password is empty", async () => {
      const { signIn } = await import("@/actions");

      const result = await signIn("test@example.com", "");

      expect(result).toEqual({
        success: false,
        error: "Email and password are required",
      });
    });

    test("returns error when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { signIn } = await import("@/actions");

      const result = await signIn("nonexistent@example.com", "password123");

      expect(result).toEqual({
        success: false,
        error: "Invalid credentials",
      });
    });

    test("returns error when password is incorrect", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-id",
        email: "test@example.com",
        password: "hashed_differentpassword",
      });

      const { signIn } = await import("@/actions");

      const result = await signIn("test@example.com", "wrongpassword");

      expect(result).toEqual({
        success: false,
        error: "Invalid credentials",
      });
    });

    test("creates session on successful sign in", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-id",
        email: "test@example.com",
        password: "hashed_password123",
      });

      const { signIn } = await import("@/actions");

      const result = await signIn("test@example.com", "password123");

      expect(result).toEqual({ success: true });
      expect(mockCreateSession).toHaveBeenCalledWith(
        "user-id",
        "test@example.com"
      );
    });

    test("returns error when database operation fails", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("DB Error"));

      const { signIn } = await import("@/actions");

      const result = await signIn("test@example.com", "password123");

      expect(result).toEqual({
        success: false,
        error: "An error occurred during sign in",
      });
    });
  });

  describe("signOut", () => {
    test("deletes session and redirects", async () => {
      const { redirect } = await import("next/navigation");

      const { signOut } = await import("@/actions");

      await signOut();

      expect(mockDeleteSession).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith("/");
    });
  });

  describe("getUser", () => {
    test("returns null when no session exists", async () => {
      mockGetSession.mockResolvedValue(null);

      const { getUser } = await import("@/actions");

      const result = await getUser();

      expect(result).toBeNull();
    });

    test("returns user data when session exists", async () => {
      const now = new Date();
      mockGetSession.mockResolvedValue({
        userId: "user-id",
        email: "test@example.com",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-id",
        email: "test@example.com",
        createdAt: now,
      });

      const { getUser } = await import("@/actions");

      const result = await getUser();

      expect(result).toEqual({
        id: "user-id",
        email: "test@example.com",
        createdAt: now,
      });
    });

    test("queries user with correct fields", async () => {
      mockGetSession.mockResolvedValue({
        userId: "user-id",
        email: "test@example.com",
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { getUser } = await import("@/actions");

      await getUser();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-id" },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      });
    });

    test("returns null when user not found in database", async () => {
      mockGetSession.mockResolvedValue({
        userId: "user-id",
        email: "test@example.com",
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { getUser } = await import("@/actions");

      const result = await getUser();

      expect(result).toBeNull();
    });

    test("returns null when database operation fails", async () => {
      mockGetSession.mockResolvedValue({
        userId: "user-id",
        email: "test@example.com",
      });
      mockPrisma.user.findUnique.mockRejectedValue(new Error("DB Error"));

      const { getUser } = await import("@/actions");

      const result = await getUser();

      expect(result).toBeNull();
    });
  });
});
