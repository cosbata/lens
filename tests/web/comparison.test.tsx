import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COMPARISON_CHANGES, Comparison } from "../../src/web/screens/Comparison";

describe("comparison screen", () => {
  it("renders the 24-hour map host and all change types", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <Comparison />
      </MantineProvider>,
    );

    expect(html).toContain("24 hours ago");
    expect(html).toContain("Now");
    expect(html).toContain('class="world-map"');
    expect(html).toContain("Visual interpolation · No forecasts");
    expect(html).toContain("Observed timeline events");
    expect(html).toContain("observed 21:41 UTC");
    expect(html).toContain('class="event-media event-media--light change-detail__media"');
    expect(html).toContain("<img");
    for (const change of COMPARISON_CHANGES) {
      expect(html).toContain(change.title);
      expect(html).toContain(change.status);
    }
  });
});
