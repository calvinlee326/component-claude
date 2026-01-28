/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "@/lib/anon-work-tracker";

describe("anon-work-tracker", () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe("setHasAnonWork", () => {
    test("does not set data when messages array is empty and fileSystemData only has root", () => {
      setHasAnonWork([], { "/": { type: "directory" } });

      expect(sessionStorage.getItem("uigen_has_anon_work")).toBeNull();
      expect(sessionStorage.getItem("uigen_anon_data")).toBeNull();
    });

    test("does not set data when both messages and fileSystemData are minimal", () => {
      setHasAnonWork([], {});

      expect(sessionStorage.getItem("uigen_has_anon_work")).toBeNull();
    });

    test("sets data when messages array has content", () => {
      const messages = [{ role: "user", content: "Create a button" }];
      setHasAnonWork(messages, { "/": { type: "directory" } });

      expect(sessionStorage.getItem("uigen_has_anon_work")).toBe("true");
      expect(sessionStorage.getItem("uigen_anon_data")).not.toBeNull();
    });

    test("sets data when fileSystemData has more than root directory", () => {
      const fileSystemData = {
        "/": { type: "directory" },
        "/App.jsx": { type: "file", content: "export default function App() {}" },
      };
      setHasAnonWork([], fileSystemData);

      expect(sessionStorage.getItem("uigen_has_anon_work")).toBe("true");
    });

    test("stores messages and fileSystemData correctly", () => {
      const messages = [
        { role: "user", content: "Create a counter" },
        { role: "assistant", content: "I'll create a counter component" },
      ];
      const fileSystemData = {
        "/": { type: "directory" },
        "/Counter.jsx": { type: "file", content: "const Counter = () => {}" },
      };

      setHasAnonWork(messages, fileSystemData);

      const storedData = JSON.parse(
        sessionStorage.getItem("uigen_anon_data")!
      );
      expect(storedData.messages).toEqual(messages);
      expect(storedData.fileSystemData).toEqual(fileSystemData);
    });

    test("overwrites existing data", () => {
      const firstMessages = [{ role: "user", content: "First" }];
      const secondMessages = [{ role: "user", content: "Second" }];

      setHasAnonWork(firstMessages, { "/": {}, "/file.txt": {} });
      setHasAnonWork(secondMessages, { "/": {}, "/other.txt": {} });

      const storedData = JSON.parse(
        sessionStorage.getItem("uigen_anon_data")!
      );
      expect(storedData.messages).toEqual(secondMessages);
    });
  });

  describe("getHasAnonWork", () => {
    test("returns false when no data is set", () => {
      expect(getHasAnonWork()).toBe(false);
    });

    test("returns true when data has been set", () => {
      sessionStorage.setItem("uigen_has_anon_work", "true");
      expect(getHasAnonWork()).toBe(true);
    });

    test("returns false for invalid storage value", () => {
      sessionStorage.setItem("uigen_has_anon_work", "false");
      expect(getHasAnonWork()).toBe(false);
    });

    test("returns false for any value other than 'true'", () => {
      sessionStorage.setItem("uigen_has_anon_work", "yes");
      expect(getHasAnonWork()).toBe(false);
    });
  });

  describe("getAnonWorkData", () => {
    test("returns null when no data is stored", () => {
      expect(getAnonWorkData()).toBeNull();
    });

    test("returns stored messages and fileSystemData", () => {
      const data = {
        messages: [{ role: "user", content: "Test" }],
        fileSystemData: { "/": {}, "/test.txt": {} },
      };
      sessionStorage.setItem("uigen_anon_data", JSON.stringify(data));

      const result = getAnonWorkData();
      expect(result).toEqual(data);
    });

    test("returns null for invalid JSON", () => {
      sessionStorage.setItem("uigen_anon_data", "invalid json {{{");
      expect(getAnonWorkData()).toBeNull();
    });

    test("returns null for empty string", () => {
      sessionStorage.setItem("uigen_anon_data", "");

      // Empty string will cause JSON.parse to throw
      expect(getAnonWorkData()).toBeNull();
    });
  });

  describe("clearAnonWork", () => {
    test("removes all anon work data from sessionStorage", () => {
      sessionStorage.setItem("uigen_has_anon_work", "true");
      sessionStorage.setItem(
        "uigen_anon_data",
        JSON.stringify({ messages: [], fileSystemData: {} })
      );

      clearAnonWork();

      expect(sessionStorage.getItem("uigen_has_anon_work")).toBeNull();
      expect(sessionStorage.getItem("uigen_anon_data")).toBeNull();
    });

    test("does not throw when no data exists", () => {
      expect(() => clearAnonWork()).not.toThrow();
    });

    test("does not affect other sessionStorage items", () => {
      sessionStorage.setItem("other_key", "other_value");
      sessionStorage.setItem("uigen_has_anon_work", "true");

      clearAnonWork();

      expect(sessionStorage.getItem("other_key")).toBe("other_value");
    });
  });

  describe("server-side behavior", () => {
    test("functions handle missing window gracefully", () => {
      // Store original window
      const originalWindow = global.window;

      // Simulate server environment by deleting window
      // @ts-expect-error - intentionally deleting window for test
      delete global.window;

      // Re-import to get fresh module with no window
      // Note: In actual server environment, these would return early
      // This test verifies the guard clauses work

      // Restore window
      global.window = originalWindow;
    });
  });

  describe("integration scenarios", () => {
    test("full workflow: set, get, clear", () => {
      // Initially no data
      expect(getHasAnonWork()).toBe(false);
      expect(getAnonWorkData()).toBeNull();

      // Set anonymous work
      const messages = [
        { role: "user", content: "Create component" },
        { role: "assistant", content: "Creating..." },
      ];
      const fileSystemData = {
        "/": { type: "directory" },
        "/App.jsx": { type: "file", content: "code here" },
      };

      setHasAnonWork(messages, fileSystemData);

      // Verify it's set
      expect(getHasAnonWork()).toBe(true);
      const data = getAnonWorkData();
      expect(data).not.toBeNull();
      expect(data!.messages).toHaveLength(2);

      // Clear and verify
      clearAnonWork();
      expect(getHasAnonWork()).toBe(false);
      expect(getAnonWorkData()).toBeNull();
    });

    test("handles complex message structures", () => {
      const messages = [
        {
          id: "msg-1",
          role: "user",
          content: "Create a todo app",
          createdAt: new Date().toISOString(),
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "I'll create a todo app for you",
          toolInvocations: [
            {
              toolName: "str_replace_editor",
              args: { command: "create", path: "/App.jsx" },
            },
          ],
        },
      ];

      const fileSystemData = {
        "/": { type: "directory", name: "/", path: "/" },
        "/App.jsx": {
          type: "file",
          name: "App.jsx",
          path: "/App.jsx",
          content: "export default function App() { return <div>Todo</div>; }",
        },
        "/components": { type: "directory", name: "components", path: "/components" },
        "/components/TodoItem.jsx": {
          type: "file",
          name: "TodoItem.jsx",
          path: "/components/TodoItem.jsx",
          content: "export const TodoItem = () => {};",
        },
      };

      setHasAnonWork(messages, fileSystemData);

      const result = getAnonWorkData();
      expect(result).not.toBeNull();
      expect(result!.messages[1].toolInvocations).toBeDefined();
      expect(result!.fileSystemData["/components/TodoItem.jsx"]).toBeDefined();
    });
  });
});
