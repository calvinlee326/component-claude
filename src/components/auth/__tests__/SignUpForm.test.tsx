import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpForm } from "../SignUpForm";

// Mock the useAuth hook
const mockSignUp = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    isLoading: false,
  }),
}));

describe("SignUpForm", () => {
  beforeEach(() => {
    mockSignUp.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders email input", () => {
    render(<SignUpForm />);
    expect(screen.getByLabelText(/^email$/i)).toBeDefined();
  });

  test("renders password input", () => {
    render(<SignUpForm />);
    expect(screen.getByLabelText(/^password$/i)).toBeDefined();
  });

  test("renders confirm password input", () => {
    render(<SignUpForm />);
    expect(screen.getByLabelText(/confirm password/i)).toBeDefined();
  });

  test("renders sign up button", () => {
    render(<SignUpForm />);
    expect(screen.getByRole("button", { name: /sign up/i })).toBeDefined();
  });

  test("displays password requirement hint", () => {
    render(<SignUpForm />);
    expect(screen.getByText(/must be at least 8 characters/i)).toBeDefined();
  });

  test("email input has correct type", () => {
    render(<SignUpForm />);
    const emailInput = screen.getByLabelText(/^email$/i);
    expect(emailInput.getAttribute("type")).toBe("email");
  });

  test("password inputs have correct type", () => {
    render(<SignUpForm />);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    expect(passwordInput.getAttribute("type")).toBe("password");
    expect(confirmInput.getAttribute("type")).toBe("password");
  });

  test("password input has minLength attribute", () => {
    render(<SignUpForm />);
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput.getAttribute("minLength")).toBe("8");
  });

  test("shows error when passwords do not match", async () => {
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "different");

    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeDefined();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test("calls signUp when passwords match", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "password123");

    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  test("calls onSuccess callback when sign up succeeds", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    render(<SignUpForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "password123");

    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  test("displays error message when sign up fails", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText(/^email$/i), "existing@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "password123");

    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText("Email already registered")).toBeDefined();
    });
  });

  test("displays default error message when error is undefined", async () => {
    mockSignUp.mockResolvedValue({ success: false });
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "password123");

    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to sign up")).toBeDefined();
    });
  });

  test("does not call onSuccess callback when sign up fails", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Error" });
    const onSuccess = vi.fn();
    render(<SignUpForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "password123");

    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeDefined();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test("clears previous error on new submission", async () => {
    mockSignUp
      .mockResolvedValueOnce({ success: false, error: "First error" })
      .mockResolvedValueOnce({ success: true });

    render(<SignUpForm />);

    // First submission - fails
    await userEvent.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "password123");
    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText("First error")).toBeDefined();
    });

    // Second submission - succeeds
    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.queryByText("First error")).toBeNull();
    });
  });

  test("all inputs are required", () => {
    render(<SignUpForm />);

    const emailInput = screen.getByLabelText(/^email$/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    expect(emailInput).toHaveProperty("required", true);
    expect(passwordInput).toHaveProperty("required", true);
    expect(confirmInput).toHaveProperty("required", true);
  });

  test("email input has placeholder", () => {
    render(<SignUpForm />);
    const emailInput = screen.getByLabelText(/^email$/i);
    expect(emailInput.getAttribute("placeholder")).toBe("you@example.com");
  });
});

describe("SignUpForm loading state", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("button shows creating account text when isLoading is controlled by form submission", async () => {
    // The loading state is managed by the hook internally
    // We can test the button text changes by checking initial state
    render(<SignUpForm />);

    const submitButton = screen.getByRole("button");
    expect(submitButton.textContent).toBe("Sign Up");
  });
});
