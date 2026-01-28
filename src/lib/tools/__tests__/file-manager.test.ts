import { describe, test, expect, beforeEach } from "vitest";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { VirtualFileSystem } from "@/lib/file-system";

describe("buildFileManagerTool", () => {
  let fileSystem: VirtualFileSystem;
  let tool: ReturnType<typeof buildFileManagerTool>;

  beforeEach(() => {
    fileSystem = new VirtualFileSystem();
    tool = buildFileManagerTool(fileSystem);
  });

  test("returns tool with description", () => {
    expect(tool.description).toContain("Rename or delete files");
  });

  describe("rename command", () => {
    test("renames a file successfully", async () => {
      fileSystem.createFile("/old.txt", "content");

      const result = await tool.execute({
        command: "rename",
        path: "/old.txt",
        new_path: "/new.txt",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully renamed /old.txt to /new.txt",
      });
      expect(fileSystem.exists("/old.txt")).toBe(false);
      expect(fileSystem.exists("/new.txt")).toBe(true);
      expect(fileSystem.readFile("/new.txt")).toBe("content");
    });

    test("moves a file to a different directory", async () => {
      fileSystem.createFile("/file.txt", "content");
      fileSystem.createDirectory("/docs");

      const result = await tool.execute({
        command: "rename",
        path: "/file.txt",
        new_path: "/docs/file.txt",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully renamed /file.txt to /docs/file.txt",
      });
      expect(fileSystem.readFile("/docs/file.txt")).toBe("content");
    });

    test("creates parent directories when moving", async () => {
      fileSystem.createFile("/file.txt", "content");

      const result = await tool.execute({
        command: "rename",
        path: "/file.txt",
        new_path: "/new/path/to/file.txt",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully renamed /file.txt to /new/path/to/file.txt",
      });
      expect(fileSystem.exists("/new/path/to")).toBe(true);
    });

    test("renames a directory with all contents", async () => {
      fileSystem.createDirectory("/src");
      fileSystem.createFile("/src/index.ts", "index");
      fileSystem.createDirectory("/src/components");
      fileSystem.createFile("/src/components/Button.tsx", "button");

      const result = await tool.execute({
        command: "rename",
        path: "/src",
        new_path: "/app",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully renamed /src to /app",
      });
      expect(fileSystem.exists("/src")).toBe(false);
      expect(fileSystem.exists("/app")).toBe(true);
      expect(fileSystem.readFile("/app/index.ts")).toBe("index");
      expect(fileSystem.readFile("/app/components/Button.tsx")).toBe("button");
    });

    test("returns error when new_path is not provided", async () => {
      fileSystem.createFile("/file.txt", "content");

      const result = await tool.execute({
        command: "rename",
        path: "/file.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "new_path is required for rename command",
      });
      expect(fileSystem.exists("/file.txt")).toBe(true);
    });

    test("returns error when source does not exist", async () => {
      const result = await tool.execute({
        command: "rename",
        path: "/nonexistent.txt",
        new_path: "/new.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to rename /nonexistent.txt to /new.txt",
      });
    });

    test("returns error when destination already exists", async () => {
      fileSystem.createFile("/source.txt", "source");
      fileSystem.createFile("/dest.txt", "dest");

      const result = await tool.execute({
        command: "rename",
        path: "/source.txt",
        new_path: "/dest.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to rename /source.txt to /dest.txt",
      });
      expect(fileSystem.readFile("/source.txt")).toBe("source");
      expect(fileSystem.readFile("/dest.txt")).toBe("dest");
    });

    test("returns error when trying to rename root", async () => {
      const result = await tool.execute({
        command: "rename",
        path: "/",
        new_path: "/root",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to rename / to /root",
      });
    });
  });

  describe("delete command", () => {
    test("deletes a file successfully", async () => {
      fileSystem.createFile("/file.txt", "content");

      const result = await tool.execute({
        command: "delete",
        path: "/file.txt",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully deleted /file.txt",
      });
      expect(fileSystem.exists("/file.txt")).toBe(false);
    });

    test("deletes a directory recursively", async () => {
      fileSystem.createDirectory("/src");
      fileSystem.createFile("/src/index.ts", "content");
      fileSystem.createDirectory("/src/components");
      fileSystem.createFile("/src/components/Button.tsx", "button");

      const result = await tool.execute({
        command: "delete",
        path: "/src",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully deleted /src",
      });
      expect(fileSystem.exists("/src")).toBe(false);
      expect(fileSystem.exists("/src/components")).toBe(false);
    });

    test("deletes an empty directory", async () => {
      fileSystem.createDirectory("/empty");

      const result = await tool.execute({
        command: "delete",
        path: "/empty",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully deleted /empty",
      });
      expect(fileSystem.exists("/empty")).toBe(false);
    });

    test("returns error when file does not exist", async () => {
      const result = await tool.execute({
        command: "delete",
        path: "/nonexistent.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to delete /nonexistent.txt",
      });
    });

    test("returns error when trying to delete root", async () => {
      const result = await tool.execute({
        command: "delete",
        path: "/",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to delete /",
      });
    });
  });

  describe("invalid command", () => {
    test("returns error for unknown command", async () => {
      // @ts-expect-error - testing invalid command
      const result = await tool.execute({
        command: "invalid",
        path: "/file.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "Invalid command",
      });
    });
  });

  describe("edge cases", () => {
    test("handles paths without leading slash", async () => {
      fileSystem.createFile("/test.txt", "content");

      const result = await tool.execute({
        command: "rename",
        path: "test.txt",
        new_path: "renamed.txt",
      });

      expect(result.success).toBe(true);
    });

    test("handles special characters in file names", async () => {
      fileSystem.createFile("/test file.txt", "content");

      const result = await tool.execute({
        command: "rename",
        path: "/test file.txt",
        new_path: "/new file.txt",
      });

      expect(result.success).toBe(true);
      expect(fileSystem.exists("/new file.txt")).toBe(true);
    });

    test("handles deeply nested paths", async () => {
      fileSystem.createFile("/a/b/c/d/e/file.txt", "deep");

      const result = await tool.execute({
        command: "delete",
        path: "/a",
      });

      expect(result.success).toBe(true);
      expect(fileSystem.exists("/a")).toBe(false);
    });

    test("new_path is ignored for delete command", async () => {
      fileSystem.createFile("/file.txt", "content");

      const result = await tool.execute({
        command: "delete",
        path: "/file.txt",
        new_path: "/ignored.txt",
      });

      expect(result.success).toBe(true);
      expect(fileSystem.exists("/ignored.txt")).toBe(false);
    });
  });
});
