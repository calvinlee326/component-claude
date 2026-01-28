import { describe, test, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility function", () => {
  test("returns empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  test("returns single class name unchanged", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  test("merges multiple class names", () => {
    expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
  });

  test("handles undefined values", () => {
    expect(cn("text-red-500", undefined, "bg-blue-500")).toBe(
      "text-red-500 bg-blue-500"
    );
  });

  test("handles null values", () => {
    expect(cn("text-red-500", null, "bg-blue-500")).toBe(
      "text-red-500 bg-blue-500"
    );
  });

  test("handles boolean false values", () => {
    expect(cn("text-red-500", false, "bg-blue-500")).toBe(
      "text-red-500 bg-blue-500"
    );
  });

  test("handles empty string values", () => {
    expect(cn("text-red-500", "", "bg-blue-500")).toBe(
      "text-red-500 bg-blue-500"
    );
  });

  test("handles conditional classes with boolean", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe(
      "base active"
    );
  });

  test("merges conflicting Tailwind classes (last one wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  test("merges conflicting padding classes", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  test("merges conflicting margin classes", () => {
    expect(cn("mt-4", "mt-8")).toBe("mt-8");
  });

  test("handles object syntax from clsx", () => {
    expect(
      cn({
        "text-red-500": true,
        "bg-blue-500": false,
        "font-bold": true,
      })
    ).toBe("text-red-500 font-bold");
  });

  test("handles array of classes", () => {
    expect(cn(["text-red-500", "bg-blue-500"])).toBe("text-red-500 bg-blue-500");
  });

  test("handles nested arrays", () => {
    expect(cn(["text-red-500", ["bg-blue-500", "font-bold"]])).toBe(
      "text-red-500 bg-blue-500 font-bold"
    );
  });

  test("handles mixed input types", () => {
    expect(
      cn(
        "base-class",
        ["array-class"],
        { "object-class": true },
        undefined,
        null,
        false && "conditional-false",
        true && "conditional-true"
      )
    ).toBe("base-class array-class object-class conditional-true");
  });

  test("preserves non-conflicting Tailwind classes", () => {
    expect(cn("text-red-500", "bg-blue-500", "p-4", "m-2")).toBe(
      "text-red-500 bg-blue-500 p-4 m-2"
    );
  });

  test("handles responsive variants correctly", () => {
    expect(cn("p-4", "md:p-8")).toBe("p-4 md:p-8");
  });

  test("handles state variants correctly", () => {
    expect(cn("bg-blue-500", "hover:bg-blue-600")).toBe(
      "bg-blue-500 hover:bg-blue-600"
    );
  });

  test("merges conflicting responsive variants", () => {
    expect(cn("md:p-4", "md:p-8")).toBe("md:p-8");
  });

  test("handles arbitrary values", () => {
    expect(cn("w-[100px]", "h-[200px]")).toBe("w-[100px] h-[200px]");
  });

  test("merges conflicting arbitrary values", () => {
    expect(cn("w-[100px]", "w-[200px]")).toBe("w-[200px]");
  });

  test("handles complex real-world example", () => {
    const baseStyles = "flex items-center justify-center";
    const sizeStyles = "w-10 h-10";
    const colorStyles = "bg-blue-500 text-white";
    const isDisabled = true;

    expect(
      cn(
        baseStyles,
        sizeStyles,
        colorStyles,
        isDisabled && "opacity-50 cursor-not-allowed"
      )
    ).toBe(
      "flex items-center justify-center w-10 h-10 bg-blue-500 text-white opacity-50 cursor-not-allowed"
    );
  });
});
