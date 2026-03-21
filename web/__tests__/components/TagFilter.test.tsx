// web/__tests__/components/TagFilter.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TagFilter from "@/components/TagFilter";

describe("TagFilter", () => {
  const TAGS = ["shark", "coral", "ray"];

  it("renders all provided tags as buttons", () => {
    render(<TagFilter tags={TAGS} activeTag={null} onTagClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "shark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "coral" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ray" })).toBeInTheDocument();
  });

  it("calls onTagClick with the tag name when a tag is clicked", () => {
    const onTagClick = vi.fn();
    render(<TagFilter tags={TAGS} activeTag={null} onTagClick={onTagClick} />);

    fireEvent.click(screen.getByRole("button", { name: "coral" }));

    expect(onTagClick).toHaveBeenCalledOnce();
    expect(onTagClick).toHaveBeenCalledWith("coral");
  });

  it("applies active styling (bg-sky-500) to the active tag", () => {
    render(<TagFilter tags={TAGS} activeTag="shark" onTagClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "shark" })).toHaveClass(
      "bg-sky-500",
    );
  });

  it("does not apply active styling to non-active tags", () => {
    render(<TagFilter tags={TAGS} activeTag="shark" onTagClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "coral" })).not.toHaveClass(
      "bg-sky-500",
    );
  });

  it("renders nothing when given an empty tags array", () => {
    const { container } = render(
      <TagFilter tags={[]} activeTag={null} onTagClick={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
