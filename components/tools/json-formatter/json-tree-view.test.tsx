import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JsonTreeView, type JsonTreeLabels } from "./json-tree-view";

const labels: JsonTreeLabels = {
  expandAll: "Expand all",
  collapseAll: "Collapse all",
  expandNode: "Expand",
  collapseNode: "Collapse",
  searchLabel: "Search keys",
  searchPlaceholder: "Search keys",
  matchCount: "__INDEX__ of __TOTAL__",
  noMatches: "No matching keys.",
  prevMatch: "Previous match",
  nextMatch: "Next match",
  itemCount: "__COUNT__ items",
};

describe("JsonTreeView", () => {
  it("renders every level expanded by default with colored key/value tokens", () => {
    render(<JsonTreeView value={{ user: { name: "Ada", active: true, score: null } }} labels={labels} />);

    expect(screen.getByText('"user"')).toBeTruthy();
    expect(screen.getByText('"name"')).toBeTruthy();
    expect(screen.getByText('"Ada"')).toBeTruthy();
    expect(screen.getByText("true")).toBeTruthy();
    expect(screen.getByText("null")).toBeTruthy();
  });

  it("collapses and expands a single node, hiding and restoring its children", () => {
    render(<JsonTreeView value={{ a: { b: 1 } }} labels={labels} />);

    expect(screen.getByText('"b"')).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Collapse" })[1]);
    expect(screen.queryByText('"b"')).toBeNull();
    expect(screen.getByText("1 items")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByText('"b"')).toBeTruthy();
  });

  it("expands and collapses every node at once", () => {
    render(<JsonTreeView value={{ a: { b: { c: 1 } } }} labels={labels} />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.queryByText('"b"')).toBeNull();
    expect(screen.queryByText('"c"')).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByText('"b"')).toBeTruthy();
    expect(screen.getByText('"c"')).toBeTruthy();
  });

  it("finds matching keys case-insensitively, shows a count, and cycles through matches", () => {
    render(<JsonTreeView value={{ userName: "a", userAge: 1, other: 2 }} labels={labels} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Search keys" }), { target: { value: "user" } });
    expect(screen.getByText("1 of 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next match" }));
    expect(screen.getByText("2 of 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next match" }));
    expect(screen.getByText("1 of 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Previous match" }));
    expect(screen.getByText("2 of 2")).toBeTruthy();
  });

  it("shows a no-matches message and disables navigation for an unmatched query", () => {
    render(<JsonTreeView value={{ name: "a" }} labels={labels} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Search keys" }), { target: { value: "zzz" } });
    expect(screen.getByText("No matching keys.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Next match" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("auto-expands collapsed ancestors so a matched key becomes visible", () => {
    render(<JsonTreeView value={{ outer: { inner: { target: 1 } } }} labels={labels} />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.queryByText('"target"')).toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: "Search keys" }), { target: { value: "target" } });
    expect(screen.getByText('"target"')).toBeTruthy();
  });

  it("renders array items without keys and with index-free item counts", () => {
    render(<JsonTreeView value={{ list: [1, 2, 3] }} labels={labels} />);

    expect(screen.getByText('"list"')).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Collapse" })[1]);
    expect(screen.getByText("3 items")).toBeTruthy();
  });
});
