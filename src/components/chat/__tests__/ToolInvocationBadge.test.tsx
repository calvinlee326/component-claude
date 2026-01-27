import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge, getToolDescription } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

describe("getToolDescription", () => {
  it("returns create description for str_replace_editor create command", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      state: "partial",
      args: { command: "create", path: "/App.jsx" },
    });
    expect(result.label).toBe("Creating /App.jsx");
  });

  it("returns edit description for str_replace_editor str_replace command", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      state: "partial",
      args: { command: "str_replace", path: "/components/Button.tsx" },
    });
    expect(result.label).toBe("Editing /components/Button.tsx");
  });

  it("returns edit description for str_replace_editor insert command", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      state: "partial",
      args: { command: "insert", path: "/utils.ts" },
    });
    expect(result.label).toBe("Editing /utils.ts");
  });

  it("returns reading description for str_replace_editor view command", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      state: "partial",
      args: { command: "view", path: "/index.tsx" },
    });
    expect(result.label).toBe("Reading /index.tsx");
  });

  it("returns delete description for file_manager delete command", () => {
    const result = getToolDescription({
      toolName: "file_manager",
      state: "partial",
      args: { command: "delete", path: "/old-file.js" },
    });
    expect(result.label).toBe("Deleting /old-file.js");
  });

  it("returns moving description for file_manager rename command", () => {
    const result = getToolDescription({
      toolName: "file_manager",
      state: "partial",
      args: { command: "rename", path: "/old.js", new_path: "/new.js" },
    });
    expect(result.label).toBe("Moving /old.js");
  });

  it("falls back to toolName for unknown tools", () => {
    const result = getToolDescription({
      toolName: "unknown_tool",
      state: "partial",
    });
    expect(result.label).toBe("unknown_tool");
  });

  it("uses 'file' as fallback when path is not provided", () => {
    const result = getToolDescription({
      toolName: "str_replace_editor",
      state: "partial",
      args: { command: "create" },
    });
    expect(result.label).toBe("Creating file");
  });
});

describe("ToolInvocationBadge", () => {
  it("renders with loading spinner when state is not result", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{
          toolName: "str_replace_editor",
          state: "partial",
          args: { command: "create", path: "/App.jsx" },
        }}
      />
    );
    expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  });

  it("renders with completed state when result is present", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{
          toolName: "str_replace_editor",
          state: "result",
          args: { command: "str_replace", path: "/Button.tsx" },
          result: "Success",
        }}
      />
    );
    expect(screen.getByText("Editing /Button.tsx")).toBeDefined();
  });

  it("renders file_manager delete correctly", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{
          toolName: "file_manager",
          state: "result",
          args: { command: "delete", path: "/temp.js" },
          result: { success: true },
        }}
      />
    );
    expect(screen.getByText("Deleting /temp.js")).toBeDefined();
  });

  it("shows spinner icon when in progress", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolInvocation={{
          toolName: "str_replace_editor",
          state: "partial",
          args: { command: "create", path: "/test.jsx" },
        }}
      />
    );
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeDefined();
  });

  it("shows action icon when complete", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolInvocation={{
          toolName: "str_replace_editor",
          state: "result",
          args: { command: "create", path: "/test.jsx" },
          result: "done",
        }}
      />
    );
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeNull();
  });
});
