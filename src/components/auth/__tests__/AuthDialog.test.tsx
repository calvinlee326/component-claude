import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthDialog } from "../AuthDialog";

// Mock the child components
vi.mock("../SignInForm", () => ({
  SignInForm: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div data-testid="sign-in-form">
      <button onClick={onSuccess}>Mock Sign In</button>
    </div>
  ),
}));

vi.mock("../SignUpForm", () => ({
  SignUpForm: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div data-testid="sign-up-form">
      <button onClick={onSuccess}>Mock Sign Up</button>
    </div>
  ),
}));

describe("AuthDialog", () => {
  afterEach(() => {
    cleanup();
  });

  test("does not render when open is false", () => {
    render(
      <AuthDialog open={false} onOpenChange={vi.fn()} />
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("renders when open is true", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} />
    );

    expect(screen.getByRole("dialog")).toBeDefined();
  });

  test("renders sign in form by default", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} />
    );

    expect(screen.getByTestId("sign-in-form")).toBeDefined();
    expect(screen.queryByTestId("sign-up-form")).toBeNull();
  });

  test("renders sign in title by default", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} />
    );

    expect(screen.getByText("Welcome back")).toBeDefined();
  });

  test("renders sign in description by default", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} />
    );

    expect(screen.getByText("Sign in to your account to continue")).toBeDefined();
  });

  test("renders sign up form when defaultMode is signup", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
    );

    expect(screen.getByTestId("sign-up-form")).toBeDefined();
    expect(screen.queryByTestId("sign-in-form")).toBeNull();
  });

  test("renders sign up title when in signup mode", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
    );

    expect(screen.getByText("Create an account")).toBeDefined();
  });

  test("renders sign up description when in signup mode", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
    );

    expect(
      screen.getByText("Sign up to start creating AI-powered React components")
    ).toBeDefined();
  });

  test("switches to sign up form when clicking sign up link", async () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} />
    );

    // Initially shows sign in
    expect(screen.getByTestId("sign-in-form")).toBeDefined();

    // Click sign up link
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    // Now shows sign up
    await waitFor(() => {
      expect(screen.getByTestId("sign-up-form")).toBeDefined();
    });
    expect(screen.queryByTestId("sign-in-form")).toBeNull();
  });

  test("switches to sign in form when clicking sign in link", async () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
    );

    // Initially shows sign up
    expect(screen.getByTestId("sign-up-form")).toBeDefined();

    // Click sign in link
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Now shows sign in
    await waitFor(() => {
      expect(screen.getByTestId("sign-in-form")).toBeDefined();
    });
    expect(screen.queryByTestId("sign-up-form")).toBeNull();
  });

  test("shows 'Don't have an account?' text in signin mode", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} />
    );

    expect(screen.getByText(/don't have an account\?/i)).toBeDefined();
  });

  test("shows 'Already have an account?' text in signup mode", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
    );

    expect(screen.getByText(/already have an account\?/i)).toBeDefined();
  });

  test("calls onOpenChange with false when form succeeds", async () => {
    const onOpenChange = vi.fn();
    render(
      <AuthDialog open={true} onOpenChange={onOpenChange} />
    );

    // Click the mock sign in button (which triggers onSuccess)
    await userEvent.click(screen.getByRole("button", { name: /mock sign in/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("updates mode when defaultMode prop changes", async () => {
    const { rerender } = render(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signin" />
    );

    expect(screen.getByTestId("sign-in-form")).toBeDefined();

    rerender(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
    );

    await waitFor(() => {
      expect(screen.getByTestId("sign-up-form")).toBeDefined();
    });
  });

  test("syncs mode with defaultMode prop changes", async () => {
    const { rerender } = render(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signin" />
    );

    // Initially shows sign in
    expect(screen.getByTestId("sign-in-form")).toBeDefined();

    // Change defaultMode to signup
    rerender(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
    );

    // Should now show sign up due to useEffect sync
    await waitFor(() => {
      expect(screen.getByTestId("sign-up-form")).toBeDefined();
    });
  });
});
