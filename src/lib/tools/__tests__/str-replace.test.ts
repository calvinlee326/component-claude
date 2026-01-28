import { describe, test, expect, beforeEach } from "vitest";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { VirtualFileSystem } from "@/lib/file-system";

describe("buildStrReplaceTool", () => {
  let fileSystem: VirtualFileSystem;
  let tool: ReturnType<typeof buildStrReplaceTool>;

  beforeEach(() => {
    fileSystem = new VirtualFileSystem();
    tool = buildStrReplaceTool(fileSystem);
  });

  test("returns tool with correct id", () => {
    expect(tool.id).toBe("str_replace_editor");
  });

  test("has parameters schema defined", () => {
    expect(tool.parameters).toBeDefined();
  });

  describe("view command", () => {
    test("views file content with line numbers", async () => {
      fileSystem.createFile("/test.txt", "line1\nline2\nline3");

      const result = await tool.execute({
        command: "view",
        path: "/test.txt",
      });

      expect(result).toBe("1\tline1\n2\tline2\n3\tline3");
    });

    test("views file with range", async () => {
      fileSystem.createFile("/test.txt", "line1\nline2\nline3\nline4\nline5");

      const result = await tool.execute({
        command: "view",
        path: "/test.txt",
        view_range: [2, 4],
      });

      expect(result).toBe("2\tline2\n3\tline3\n4\tline4");
    });

    test("views directory contents", async () => {
      fileSystem.createDirectory("/src");
      fileSystem.createFile("/src/index.ts", "");
      fileSystem.createDirectory("/src/components");

      const result = await tool.execute({
        command: "view",
        path: "/src",
      });

      expect(result).toContain("[DIR] components");
      expect(result).toContain("[FILE] index.ts");
    });

    test("returns error for non-existent path", async () => {
      const result = await tool.execute({
        command: "view",
        path: "/nonexistent.txt",
      });

      expect(result).toBe("File not found: /nonexistent.txt");
    });

    test("views empty file", async () => {
      fileSystem.createFile("/empty.txt", "");

      const result = await tool.execute({
        command: "view",
        path: "/empty.txt",
      });

      expect(result).toBe("1\t");
    });

    test("views empty directory", async () => {
      fileSystem.createDirectory("/empty");

      const result = await tool.execute({
        command: "view",
        path: "/empty",
      });

      expect(result).toBe("(empty directory)");
    });
  });

  describe("create command", () => {
    test("creates a new file with content", async () => {
      const result = await tool.execute({
        command: "create",
        path: "/new-file.txt",
        file_text: "Hello, World!",
      });

      expect(result).toBe("File created: /new-file.txt");
      expect(fileSystem.readFile("/new-file.txt")).toBe("Hello, World!");
    });

    test("creates file with empty content when file_text is undefined", async () => {
      const result = await tool.execute({
        command: "create",
        path: "/empty-file.txt",
      });

      expect(result).toBe("File created: /empty-file.txt");
      expect(fileSystem.readFile("/empty-file.txt")).toBe("");
    });

    test("creates parent directories automatically", async () => {
      const result = await tool.execute({
        command: "create",
        path: "/src/components/Button.tsx",
        file_text: "export const Button = () => {};",
      });

      expect(result).toBe("File created: /src/components/Button.tsx");
      expect(fileSystem.exists("/src")).toBe(true);
      expect(fileSystem.exists("/src/components")).toBe(true);
    });

    test("returns error when file already exists", async () => {
      fileSystem.createFile("/existing.txt", "content");

      const result = await tool.execute({
        command: "create",
        path: "/existing.txt",
        file_text: "new content",
      });

      expect(result).toBe("Error: File already exists: /existing.txt");
      expect(fileSystem.readFile("/existing.txt")).toBe("content");
    });

    test("creates file with multiline content", async () => {
      const multilineContent = `import React from 'react';

export function Component() {
  return <div>Hello</div>;
}`;

      const result = await tool.execute({
        command: "create",
        path: "/Component.tsx",
        file_text: multilineContent,
      });

      expect(result).toBe("File created: /Component.tsx");
      expect(fileSystem.readFile("/Component.tsx")).toBe(multilineContent);
    });
  });

  describe("str_replace command", () => {
    test("replaces string in file", async () => {
      fileSystem.createFile("/test.txt", "Hello, World!");

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        old_str: "World",
        new_str: "Universe",
      });

      expect(result).toBe("Replaced 1 occurrence(s) of the string in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("Hello, Universe!");
    });

    test("replaces all occurrences of string", async () => {
      fileSystem.createFile("/test.txt", "foo bar foo baz foo");

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        old_str: "foo",
        new_str: "qux",
      });

      expect(result).toBe("Replaced 3 occurrence(s) of the string in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("qux bar qux baz qux");
    });

    test("handles empty old_str (returns error)", async () => {
      fileSystem.createFile("/test.txt", "content");

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        old_str: "",
        new_str: "new",
      });

      // Empty string is not found in file, returns error
      expect(result).toBe('Error: String not found in file: ""');
    });

    test("handles empty new_str (deletion)", async () => {
      fileSystem.createFile("/test.txt", "hello world");

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        old_str: "world",
        new_str: "",
      });

      expect(result).toBe("Replaced 1 occurrence(s) of the string in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("hello ");
    });

    test("returns error for non-existent file", async () => {
      const result = await tool.execute({
        command: "str_replace",
        path: "/nonexistent.txt",
        old_str: "foo",
        new_str: "bar",
      });

      expect(result).toBe("Error: File not found: /nonexistent.txt");
    });

    test("returns error when old_str not found", async () => {
      fileSystem.createFile("/test.txt", "hello world");

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        old_str: "notfound",
        new_str: "replacement",
      });

      expect(result).toBe('Error: String not found in file: "notfound"');
    });

    test("returns error for directory", async () => {
      fileSystem.createDirectory("/src");

      const result = await tool.execute({
        command: "str_replace",
        path: "/src",
        old_str: "foo",
        new_str: "bar",
      });

      expect(result).toBe("Error: Cannot edit a directory: /src");
    });

    test("handles undefined old_str and new_str (returns error for empty search)", async () => {
      fileSystem.createFile("/test.txt", "content");

      const result = await tool.execute({
        command: "str_replace",
        path: "/test.txt",
      });

      // When old_str is undefined (treated as empty string), it returns error
      expect(result).toBe('Error: String not found in file: ""');
    });
  });

  describe("insert command", () => {
    test("inserts text at specified line", async () => {
      fileSystem.createFile("/test.txt", "line1\nline2\nline3");

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: 1,
        new_str: "inserted",
      });

      expect(result).toBe("Text inserted at line 1 in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe(
        "line1\ninserted\nline2\nline3"
      );
    });

    test("inserts at beginning (line 0)", async () => {
      fileSystem.createFile("/test.txt", "line1\nline2");

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: 0,
        new_str: "first",
      });

      expect(result).toBe("Text inserted at line 0 in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("first\nline1\nline2");
    });

    test("inserts at end of file", async () => {
      fileSystem.createFile("/test.txt", "line1\nline2");

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: 2,
        new_str: "last",
      });

      expect(result).toBe("Text inserted at line 2 in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("line1\nline2\nlast");
    });

    test("returns error for invalid line number", async () => {
      fileSystem.createFile("/test.txt", "line1\nline2");

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: 10,
        new_str: "text",
      });

      expect(result).toBe("Error: Invalid line number: 10. File has 2 lines.");
    });

    test("returns error for negative line number", async () => {
      fileSystem.createFile("/test.txt", "content");

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: -1,
        new_str: "text",
      });

      expect(result).toBe("Error: Invalid line number: -1. File has 1 lines.");
    });

    test("returns error for non-existent file", async () => {
      const result = await tool.execute({
        command: "insert",
        path: "/nonexistent.txt",
        insert_line: 0,
        new_str: "text",
      });

      expect(result).toBe("Error: File not found: /nonexistent.txt");
    });

    test("returns error for directory", async () => {
      fileSystem.createDirectory("/src");

      const result = await tool.execute({
        command: "insert",
        path: "/src",
        insert_line: 0,
        new_str: "text",
      });

      expect(result).toBe("Error: Cannot edit a directory: /src");
    });

    test("handles undefined insert_line (defaults to 0)", async () => {
      fileSystem.createFile("/test.txt", "existing");

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        new_str: "first",
      });

      expect(result).toBe("Text inserted at line 0 in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("first\nexisting");
    });

    test("handles undefined new_str (inserts empty string)", async () => {
      fileSystem.createFile("/test.txt", "line1\nline2");

      const result = await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: 1,
      });

      expect(result).toBe("Text inserted at line 1 in /test.txt");
      expect(fileSystem.readFile("/test.txt")).toBe("line1\n\nline2");
    });
  });

  describe("undo_edit command", () => {
    test("returns error message as undo is not supported", async () => {
      const result = await tool.execute({
        command: "undo_edit",
        path: "/test.txt",
      });

      expect(result).toBe(
        "Error: undo_edit command is not supported in this version. Use str_replace to revert changes."
      );
    });
  });

  describe("edge cases", () => {
    test("handles paths without leading slash", async () => {
      const result = await tool.execute({
        command: "create",
        path: "test.txt",
        file_text: "content",
      });

      // The file system returns the path as provided
      expect(result).toBe("File created: test.txt");
      expect(fileSystem.exists("/test.txt")).toBe(true);
    });

    test("handles paths with double slashes", async () => {
      const result = await tool.execute({
        command: "create",
        path: "//src//test.txt",
        file_text: "content",
      });

      // The file system returns the path as provided but normalizes internally
      expect(result).toBe("File created: //src//test.txt");
      expect(fileSystem.exists("/src/test.txt")).toBe(true);
    });

    test("handles special characters in content", async () => {
      const content = "const regex = /\\w+/g;\nconst str = 'hello\\nworld';";

      await tool.execute({
        command: "create",
        path: "/special.js",
        file_text: content,
      });

      expect(fileSystem.readFile("/special.js")).toBe(content);
    });

    test("handles unicode content", async () => {
      const content = "const greeting = '你好世界 🌍';";

      await tool.execute({
        command: "create",
        path: "/unicode.js",
        file_text: content,
      });

      expect(fileSystem.readFile("/unicode.js")).toBe(content);
    });
  });
});
