// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConceptBar } from "@/components/ConceptBar";

afterEach(cleanup);

// Wording approved in D-010 [RB43, Res #26].
describe("ConceptBar", () => {
  it("shows the approved wording as a note", () => {
    render(<ConceptBar />);
    expect(screen.getByRole("note").textContent).toBe(
      "A concept by Scott Reasinger. Not affiliated with any company or website.",
    );
  });
});
