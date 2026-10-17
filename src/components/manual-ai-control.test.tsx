import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManualAiControl } from "./manual-ai-control";
import { demoPulseClients } from "@/lib/business-pulse-workspace";
import { emptyConversation, makeConversation } from "@/lib/pulse-conversation";
const client = { ...demoPulseClients()[0], conversation: makeConversation({ ...emptyConversation, response: 'Дорого. Хотим сократить потери заявок.' }) };
describe("ManualAiControl — response evidence", () => {
  afterEach(cleanup);
  it("replaces industry segments with response groups", () => {
    render(<ManualAiControl clients={[client]} onOpenClient={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Что говорят клиенты' })).toBeDefined();
    expect(screen.queryByText('Строительство')).toBeNull();
    expect(screen.getByRole('button', { name: /Возражения · 1/ })).toBeDefined();
    expect(screen.getByText('Дорого. Хотим сократить потери заявок.')).toBeDefined();
  });
  it("filters evidence and exposes an actionable empty state", () => {
    render(<ManualAiControl clients={[client]} onOpenClient={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Уточнить · 0/ }));
    expect(screen.getByText(/В этой группе пока нет записей/)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Открыть карточку/ })).toBeNull();
  });
  it("opens the actual client and distinguishes legacy notes", () => {
    const open = vi.fn();
    render(<ManualAiControl clients={[demoPulseClients()[0]]} onOpenClient={open} />);
    expect(screen.getByText(/Контекст журнала · не прямая цитата/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Открыть карточку/ }));
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 'demo-1' }));
  });
});
