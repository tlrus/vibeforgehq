import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePulseWorkspace } from './use-pulse-workspace';
import { usePulseNavigation } from './use-pulse-navigation';
import { businessPulseStorageKey } from './business-pulse-data';

beforeEach(() => { localStorage.clear(); window.history.replaceState({}, '', '/business-pulse'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('workspace persistence and navigation', () => {
  it('does not resurrect the imported journal after the last card was removed', async () => {
    localStorage.setItem(businessPulseStorageKey, '[]');
    const { result } = renderHook(usePulseWorkspace);
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.clients).toEqual([]);
  });
  it('keeps demonstration separate from the working journal', async () => {
    localStorage.setItem(businessPulseStorageKey, '[]');
    window.history.replaceState({}, '', '/business-pulse?demo=1');
    const { result } = renderHook(usePulseWorkspace);
    await waitFor(() => expect(result.current.clients).toHaveLength(8));
    act(() => { result.current.setClients(current => current.slice(1)); });
    expect(localStorage.getItem(businessPulseStorageKey)).toBe('[]');
    expect(JSON.parse(localStorage.getItem(businessPulseStorageKey + '-demo')!)).toHaveLength(7);
  });
  it('reports failed writes without pretending they were saved', async () => {
    localStorage.setItem(businessPulseStorageKey, '[]');
    const { result } = renderHook(usePulseWorkspace);
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    let saved = true;
    act(() => { saved = result.current.setClients(current => current); });
    expect(saved).toBe(false);
    expect(result.current.error).toContain('не сохранены');
  });
  it('restores filters and selected client on browser navigation', async () => {
    const { result } = renderHook(usePulseNavigation);
    act(() => result.current.navigate({ view: 'crm', q: 'Север', client: 'demo-1' }));
    expect(location.search).toContain('client=demo-1');
    act(() => {
      window.history.replaceState({}, '', '/business-pulse?view=crm&q=test');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.query.get('view')).toBe('crm');
    expect(result.current.query.get('q')).toBe('test');
    expect(result.current.query.get('client')).toBeNull();
  });
});
