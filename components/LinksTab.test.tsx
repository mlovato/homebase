import { render, screen, fireEvent } from "@testing-library/react";
import { LinksTab, type LinksTabProps } from "./LinksTab";
import type { CategoryWithLinks, Link } from "@/lib/types";

// Mock heavy drag-and-drop and form dependencies
jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: jest.fn(),
  pointerWithin: jest.fn(() => []),
  rectIntersection: jest.fn(() => []),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  useDroppable: () => ({ setNodeRef: jest.fn() }),
}));
jest.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  rectSortingStrategy: jest.fn(),
  verticalListSortingStrategy: jest.fn(),
}));
jest.mock("@/components/SortableLinkCard", () => ({
  SortableLinkCard: ({ link }: { link: Link }) => (
    <div data-testid="sortable-card">{link.name}</div>
  ),
}));
jest.mock("@/components/SortableCategorySection", () => ({
  SortableCategorySection: ({
    category,
    onDeleteCategory,
  }: {
    category: CategoryWithLinks;
    onDeleteCategory: (id: number) => void;
  }) => (
    <section>
      <h3>{category.name}</h3>
      {category.links.map((l) => (
        <div key={l.id}>{l.name}</div>
      ))}
      <button onClick={() => onDeleteCategory(category.id)}>Delete</button>
    </section>
  ),
}));
jest.mock("@/components/AdminLinkForm", () => ({
  AdminLinkForm: () => <div data-testid="link-form" />,
}));
jest.mock("@/components/AdminCategoryForm", () => ({
  AdminCategoryForm: () => <div data-testid="category-form" />,
}));

const mediaCategory: CategoryWithLinks = {
  id: 1,
  name: "Media",
  sort_order: 0,
  links: [
    {
      id: 1,
      category_id: 1,
      name: "Plex",
      url: "http://plex",
      url_alt: null,
      icon_type: "builtin",
      icon_value: "plex",
      sort_order: 0,
    },
  ],
};

const baseProps: LinksTabProps = {
  categories: [],
  uncategorized: [],
  allCategories: [],
  loading: false,
  modal: { type: "none" },
  setModal: jest.fn(),
  sensors: [],
  handleCreateCategory: jest.fn(),
  handleUpdateCategory: jest.fn(),
  handleDeleteCategory: jest.fn(),
  handleCreateLink: jest.fn(),
  handleUpdateLink: jest.fn(),
  handleDeleteLink: jest.fn(),
  handleDragEnd: jest.fn(),
  intervalMs: 10000,
};

afterEach(() => jest.clearAllMocks());

describe("LinksTab", () => {
  it("shows loading indicator while data is loading", () => {
    render(<LinksTab {...baseProps} loading={true} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when there are no categories or links", () => {
    render(<LinksTab {...baseProps} />);
    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
  });

  it("renders an Add Category button", () => {
    render(<LinksTab {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /add category/i }),
    ).toBeInTheDocument();
  });

  it("calls setModal to open create-category when Add Category is clicked", () => {
    const setModal = jest.fn();
    render(<LinksTab {...baseProps} setModal={setModal} />);
    fireEvent.click(screen.getByRole("button", { name: /add category/i }));
    expect(setModal).toHaveBeenCalledWith({ type: "create-category" });
  });

  it("renders category name and its links", () => {
    render(<LinksTab {...baseProps} categories={[mediaCategory]} />);
    expect(screen.getByText("Media")).toBeInTheDocument();
    expect(screen.getByText("Plex")).toBeInTheDocument();
  });

  it("renders uncategorized section when uncategorized links exist", () => {
    const uncategorized: Link[] = [
      {
        id: 9,
        category_id: null,
        name: "Orphan",
        url: "http://orphan",
        url_alt: null,
        icon_type: "builtin",
        icon_value: null,
        sort_order: 0,
      },
    ];
    render(<LinksTab {...baseProps} uncategorized={uncategorized} />);
    expect(
      screen.getByRole("heading", { name: /uncategorized/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Orphan")).toBeInTheDocument();
  });

  it("calls handleDeleteCategory with confirmation when Delete is clicked", () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const handleDeleteCategory = jest.fn();
    render(
      <LinksTab
        {...baseProps}
        categories={[mediaCategory]}
        handleDeleteCategory={handleDeleteCategory}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(handleDeleteCategory).toHaveBeenCalledWith(1);
  });
});
