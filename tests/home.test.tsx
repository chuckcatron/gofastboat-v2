import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders the Go Fast Boat brand heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /go fast boat/i })
    ).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    render(<Home />);
    expect(
      screen.getByText(/affordable performance, fishing, and go-fast boats/i)
    ).toBeInTheDocument();
  });
});
