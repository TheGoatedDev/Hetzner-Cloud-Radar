import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Masthead } from "./masthead";

describe("Masthead", () => {
    // Masthead renders on every page, but only the home page has #subscribe.
    it("links Subscribe to the home page subscribe section", () => {
        const html = renderToStaticMarkup(
            createElement(Masthead, { observedAt: "now" }),
        );
        expect(html).toContain('href="/#subscribe"');
    });
});
