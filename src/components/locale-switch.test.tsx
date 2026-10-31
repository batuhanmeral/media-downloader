import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "@/test/render";
import { LocaleSwitch } from "./locale-switch";

describe("LocaleSwitch", () => {
  it("marks the active locale", () => {
    renderWithI18n(<LocaleSwitch onSelect={vi.fn()} />, "tr");
    expect(screen.getByRole("group", { name: "Dil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "TR" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("asks the server to switch to the chosen locale", async () => {
    const onSelect = vi.fn(async () => {});
    renderWithI18n(<LocaleSwitch onSelect={onSelect} />, "tr");
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(onSelect).toHaveBeenCalledWith("en");
  });
});
