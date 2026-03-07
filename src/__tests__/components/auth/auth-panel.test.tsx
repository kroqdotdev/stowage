import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { vi } from "vitest";
import { AuthPanel } from "@/components/auth/auth-panel";

describe("AuthPanel", () => {
  it("renders title, description, and children", () => {
    render(
      <AuthPanel title="Welcome" description="Sign in to continue">
        <form data-testid="auth-form">
          <input type="email" />
        </form>
      </AuthPanel>,
    );

    expect(
      screen.getByRole("heading", { name: "Welcome" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
    expect(screen.getByTestId("auth-form")).toBeInTheDocument();
  });

  it("renders footer link when provided", () => {
    render(
      <AuthPanel
        title="Sign in"
        description="Enter credentials"
        footer={{
          prompt: "Need an account?",
          href: "/setup",
          linkLabel: "Set up",
        }}
      >
        <div>Form</div>
      </AuthPanel>,
    );

    expect(screen.getByText("Need an account?")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Set up" });
    expect(link).toHaveAttribute("href", "/setup");
  });

  it("does not render footer when not provided", () => {
    render(
      <AuthPanel title="Sign in" description="Enter credentials">
        <div>Form</div>
      </AuthPanel>,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
