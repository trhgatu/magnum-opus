import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// findBy*/waitFor mặc định chỉ chờ 1s; khi turbo chạy test mọi package song
// song, cập nhật UI bất đồng bộ từng chậm hơn thế vì thiếu CPU. Assertion
// sai thật vẫn fail — chỉ là sau 5s thay vì 1s.
configure({ asyncUtilTimeout: 5_000 });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

class ResizeObserverMock implements ResizeObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

afterEach(() => {
  cleanup();
});
