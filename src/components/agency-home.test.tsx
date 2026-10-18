import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AgencyHome } from "./agency-home";

describe("AgencyHome", () => {
  afterEach(cleanup);
  it("shows service positioning, honest project status and a safe demo link", () => {
    render(<AgencyHome />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Собственный продукт")).toBeInTheDocument();
    expect(screen.getByText("Направление разработки")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть демо" })).toHaveAttribute("href", "/business-pulse?demo=1");
    expect(screen.getByRole("link", { name: "Написать в WhatsApp ↗" })).toHaveAttribute("href", "https://wa.me/77081102995");
    for (const link of screen.getAllByRole("link", { name: "Оставить заявку" })) expect(link).toHaveAttribute("href", "#request");
  });
});
