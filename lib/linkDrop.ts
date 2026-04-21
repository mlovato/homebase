import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";
import type { CategoryWithLinks, Link } from "@/lib/types";

export const DND_TYPE = {
  CATEGORY: "category",
  LINK: "link",
  LINK_CONTAINER: "link-container",
} as const;

export type DndType = (typeof DND_TYPE)[keyof typeof DND_TYPE];

export type LinkContainerId = number | null;

export const UNCATEGORIZED_LINK_CONTAINER = "links-uncategorized";

export function linkContainerId(categoryId: LinkContainerId): string {
  return categoryId === null
    ? UNCATEGORIZED_LINK_CONTAINER
    : `links-cat-${categoryId}`;
}

export function parseLinkContainerId(id: string): LinkContainerId | undefined {
  if (id === UNCATEGORIZED_LINK_CONTAINER) return null;
  const match = /^links-cat-(\d+)$/.exec(id);
  return match ? Number(match[1]) : undefined;
}

export function sortableCategoryId(categoryId: number): string {
  return `category-${categoryId}`;
}

export function parseSortableCategoryId(
  id: UniqueIdentifier,
): number | undefined {
  if (typeof id !== "string") return undefined;
  const match = /^category-(\d+)$/.exec(id);
  return match ? Number(match[1]) : undefined;
}

export type LinkContainerState = {
  categoryId: LinkContainerId;
  links: Link[];
};

export type LinkDropResult = {
  source: LinkContainerState;
  target?: LinkContainerState;
};

export type LinkDropInput = {
  activeId: number;
  sourceContainerId: LinkContainerId;
  targetContainerId: LinkContainerId;
  targetIndex: number;
  categories: CategoryWithLinks[];
  uncategorized: Link[];
};

export type ResolvedLinkDrop = {
  activeId: number;
  source: LinkContainerId;
  target: LinkContainerId;
  overId: UniqueIdentifier;
};

export function resolveLinkDropContainers(
  event: DragEndEvent,
): ResolvedLinkDrop | null {
  const { active, over } = event;
  if (!over) return null;
  if (typeof active.id !== "number") return null;

  const activeContainer = active.data.current?.sortable?.containerId;
  if (typeof activeContainer !== "string") return null;

  const overSortableContainer = over.data.current?.sortable?.containerId;
  const overContainer =
    typeof overSortableContainer === "string"
      ? overSortableContainer
      : typeof over.id === "string"
        ? over.id
        : undefined;
  if (overContainer === undefined) return null;

  const source = parseLinkContainerId(activeContainer);
  const target = parseLinkContainerId(overContainer);
  if (source === undefined || target === undefined) return null;

  return { activeId: active.id, source, target, overId: over.id };
}

function getContainerLinks(
  containerId: LinkContainerId,
  categories: CategoryWithLinks[],
  uncategorized: Link[],
): Link[] | undefined {
  if (containerId === null) return uncategorized;
  return categories.find((c) => c.id === containerId)?.links;
}

export function computeLinkDrop({
  activeId,
  sourceContainerId,
  targetContainerId,
  targetIndex,
  categories,
  uncategorized,
}: LinkDropInput): LinkDropResult | null {
  const sourceLinks = getContainerLinks(
    sourceContainerId,
    categories,
    uncategorized,
  );
  const targetLinks = getContainerLinks(
    targetContainerId,
    categories,
    uncategorized,
  );
  if (!sourceLinks || !targetLinks) return null;

  const oldIndex = sourceLinks.findIndex((l) => l.id === activeId);
  if (oldIndex === -1) return null;

  if (sourceContainerId === targetContainerId) {
    const clamped = Math.max(0, Math.min(targetIndex, sourceLinks.length - 1));
    if (oldIndex === clamped) return null;
    return {
      source: {
        categoryId: sourceContainerId,
        links: arrayMove(sourceLinks, oldIndex, clamped),
      },
    };
  }

  const movedLink: Link = {
    ...sourceLinks[oldIndex],
    category_id: targetContainerId,
  };
  const nextSource = [
    ...sourceLinks.slice(0, oldIndex),
    ...sourceLinks.slice(oldIndex + 1),
  ];
  const clamped = Math.max(0, Math.min(targetIndex, targetLinks.length));
  const nextTarget = [
    ...targetLinks.slice(0, clamped),
    movedLink,
    ...targetLinks.slice(clamped),
  ];

  return {
    source: { categoryId: sourceContainerId, links: nextSource },
    target: { categoryId: targetContainerId, links: nextTarget },
  };
}
