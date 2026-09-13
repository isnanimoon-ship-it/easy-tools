import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownPreview } from "./markdown-preview";

const labels = { emptyLabel: "Empty", blockedImageLabel: "Image blocked", blockedLinkLabel: "Link blocked" };

describe("MarkdownPreview", () => {
  it("renders CommonMark and GFM structures", () => {
    const { container } = render(<MarkdownPreview {...labels} source={"# Title\n\n- [x] Done\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```ts\nconst x = 1\n```"}/>);
    expect(screen.getByRole("heading", { name: "Title" })).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
    expect(container.querySelector("code.language-ts")?.textContent).toContain("const x = 1");
  });

  it("does not create active HTML, unsafe links, or image requests", () => {
    const source = "<script>window.evil = true</script>\n\n[bad](javascript:alert(1)) [safe](https://example.com)\n\n![tracker](https://tracker.invalid/pixel.png)";
    const { container } = render(<MarkdownPreview {...labels} source={source}/>);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/Image blocked/)).toBeTruthy();
    expect(screen.getByText("bad").closest("a")).toBeNull();
    expect(screen.getByRole("link", { name: "safe" }).getAttribute("rel")).toBe("noopener noreferrer nofollow");
  });

  it("shows a normal empty state", () => {
    render(<MarkdownPreview {...labels} source={"  \n"}/>);
    expect(screen.getByText("Empty")).toBeTruthy();
  });
});
