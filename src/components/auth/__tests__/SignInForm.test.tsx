import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm } from "../SignInForm";

// Mock the useAuth hook
const mockSignIn = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isLoading: false,
  }),
}));

describe("SignInForm", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders email and password inputs", () => {
    render(<SignInForm />);

    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
  });

  test("renders sign in button", () => {
    render(<SignInForm />);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  test("email input has correct type", () => {
    render(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput.getAttribute("type")).toBe("email");
  });

  test("password input has correct type", () => {
    render(<SignInForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput.getAttribute("type")).toBe("password");
  });

  test("calls signIn with email and password on submit", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    render(<SignInForm />);

    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  test("calls onSuccess callback when sign in succeeds", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    render(<SignInForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  test("displays error message when sign in fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });
    render(<SignInForm />);

    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpassword");

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeDefined();
    });
  });

  test("displays default error message when error is undefined", async () => {
    mockSignIn.mockResolvedValue({ success: false });
    render(<SignInForm />);

    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password");

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to sign in")).toBeDefined();
    });
  });

  test("does not call onSuccess callback when sign in fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Error" });
    const onSuccess = vi.fn();
    render(<SignInForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeDefined();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test("clears previous error on new submission", async () => {
    mockSignIn
      .mockResolvedValueOnce({ success: false, error: "First error" })
      .mockResolvedValueOnce({ success: true });

    render(<SignInForm />);

    // First submission - fails
    await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("First error")).toBeDefined();
    });

    // Clear and type new values
    await userEvent.clear(screen.getByLabelText(/password/i));
    await userEvent.type(screen.getByLabelText(/password/i), "correct");

    // Second submission - succeeds
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.queryByText("First error")).toBeNull();
    });
  });

  test("inputs are required", () => {
    render(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveProperty("required", true);
    expect(passwordInput).toHaveProperty("required", true);
  });

  test("email input has placeholder", () => {
    render(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput.getAttribute("placeholder")).toBe("you@example.com");
  });
});

describe("SignInForm loading state", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("button shows sign in text by default", () => {
    render(<SignInForm />);

    const submitButton = screen.getByRole("button");
    expect(submitButton.textContent).toBe("Sign In");
  });
});
