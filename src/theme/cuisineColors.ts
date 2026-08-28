// Cuisine is free text (whatever the poster typed in Post Recipe → Details), not a fixed
// enum. Common cuisines get a hand-picked color so the result looks intentional rather than
// arbitrary; anything else falls back to a deterministic HSL hash, which spreads any string
// across the full hue wheel (avoiding the visual clustering a small fixed color array would
// cause for lookalike hashes) so it always gets a distinct-enough, same-every-time color.
const CURATED: Record<string, string> = {
  italian: '#8C2F2F',
  mexican: '#B5451F',
  american: '#7A5230',
  southern: '#A6791E',
  'southern us': '#A6791E',
  indian: '#B5651D',
  'south indian': '#C97A1E',
  'north indian': '#B5651D',
  chinese: '#A62B2B',
  japanese: '#5B3A5B',
  korean: '#9C3B4A',
  thai: '#2F6B4F',
  vietnamese: '#1F5C5C',
  filipino: '#8A6D1F',
  greek: '#2F5233',
  mediterranean: '#3B6B6B',
  french: '#3A4D6B',
  spanish: '#A6431F',
  german: '#5C4A2E',
  caribbean: '#1F7A5C',
  jamaican: '#1F7A5C',
  ethiopian: '#8A4B1F',
  'middle eastern': '#7A5B2E',
  lebanese: '#7A5B2E',
  moroccan: '#B5651D',
};

const DEFAULT_COLOR = '#6B5B4D'; // warm neutral brown, used when no cuisine is set

function hashHue(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export function getCuisineColor(cuisine?: string | null): string {
  const trimmed = cuisine?.trim();
  if (!trimmed) return DEFAULT_COLOR;
  const curated = CURATED[trimmed.toLowerCase()];
  if (curated) return curated;
  const hue = hashHue(trimmed.toLowerCase());
  return `hsl(${hue}, 45%, 32%)`;
}
