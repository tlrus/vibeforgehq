import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContactRequest } from "./contact-request";

describe("ContactRequest", () => {
  afterEach(cleanup);
  it("shows the owner's phone, direct WhatsApp and original QR contact", () => {
    render(<ContactRequest />);
    expect(screen.getByRole("link", { name: "Написать в WhatsApp ↗" })).toHaveAttribute("href", "https://wa.me/77081102995");
    expect(screen.getByRole("link", { name: "Открыть контакт Руслана в WhatsApp" })).toHaveAttribute("href", "https://wa.me/qr/BT35IQF7XT66E1");
    expect(screen.getByAltText("QR-код WhatsApp Руслана")).toHaveAttribute("src", "/whatsapp-ruslan.png");
    expect(screen.getByText(/До этого форма не отправляет/)).toBeInTheDocument();
  });
  it("rejects an invalid phone and preserves the entered fields", () => {
    render(<ContactRequest />);
    fireEvent.change(screen.getByLabelText("Ваше имя"), { target: { value: "Тест" } });
    fireEvent.change(screen.getByLabelText("Номер телефона"), { target: { value: "123" } });
    fireEvent.submit(screen.getByRole("button", { name: /Подготовить заявку/ }).closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("Укажите номер телефона");
    expect(screen.getByLabelText("Ваше имя")).toHaveValue("Тест");
    expect(screen.getByLabelText("Номер телефона")).toHaveAttribute("aria-invalid", "true");
  });
});
