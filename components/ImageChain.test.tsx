/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { ImageChain } from "./ImageChain";

const SOURCES = ["/a.svg", "/b.svg", "/c.png"];

function chain(sources = SOURCES) {
  return (
    <ImageChain
      sources={sources}
      alt="Icon"
      className="icon"
      fallback={<span>fallback</span>}
    />
  );
}

const renderChain = () => render(chain());

describe("ImageChain", () => {
  it("shows the first source", () => {
    renderChain();
    expect(screen.getByRole("img")).toHaveAttribute("src", "/a.svg");
  });

  it("moves to the next source when one fails", () => {
    renderChain();
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/b.svg");
  });

  it("renders the fallback once every source has failed", () => {
    renderChain();
    SOURCES.forEach(() => fireEvent.error(screen.getByRole("img")));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("fallback")).toBeInTheDocument();
  });

  it("starts again from the top when the sources change", () => {
    const { rerender } = renderChain();
    fireEvent.error(screen.getByRole("img"));

    rerender(chain(["/x.svg", "/y.svg"]));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/x.svg");
  });

  // Server-rendered, a fast 404 fired before React listened and stalled it.
  it("keeps the img out of the server-rendered HTML", () => {
    const html = renderToString(chain());
    expect(html).not.toContain("<img");
    expect(html).toContain('class="icon"');
  });
});
