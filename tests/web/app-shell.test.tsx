import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "../../src/web/App";

describe("application shell", () => {
  it("renders the restrained editorial shell with keyboard landmarks", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('href="#main-content"');
    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain('aria-label="LENS home"');
    expect(html).toContain("Updating");
  });
});
