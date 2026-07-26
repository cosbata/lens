import type { TodayEvent } from "../map/briefing-fixture";
import "../styles/event-media.css";

export function EventMedia({
  media,
  variant,
  className = "",
}: {
  media?: TodayEvent["media"];
  variant: "dark" | "light";
  className?: string;
}) {
  if (!media) return null;
  return (
    <figure className={`event-media event-media--${variant} ${className}`.trim()}>
      <img src={media.src} alt={media.alt} loading="lazy" width="640" height="360" />
      <figcaption>
        {media.kind === "location" && <span>Location preview</span>}
        {media.href ? (
          <a href={media.href} target="_blank" rel="noreferrer">{media.credit} ↗</a>
        ) : media.credit}
      </figcaption>
    </figure>
  );
}
