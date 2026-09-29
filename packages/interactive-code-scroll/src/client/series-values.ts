/** A card stays visible when no tag is selected or it has any selected tag. */
export function matchesTags(cardTags: readonly string[], selected: readonly string[]): boolean {
  return selected.length === 0 || selected.some((tag) => cardTags.includes(tag));
}

export function countLabel(visible: number, total: number): string {
  const noun = total === 1 ? "tutorial" : "tutorials";
  return visible === total ? `${total} ${noun}` : `${visible} of ${total} ${noun}`;
}
