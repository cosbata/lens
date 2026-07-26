export function StoryProgress({
  eventIds,
  activeIndex,
  onSelect,
}: {
  eventIds: readonly string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="story-progress" aria-label="Selected events">
      {eventIds.map((eventId, index) => (
        <button
          type="button"
          data-map-event={eventId}
          aria-label={`Show event ${index + 1}`}
          aria-current={index === activeIndex ? "step" : undefined}
          onClick={() => onSelect(index)}
          key={eventId}
        />
      ))}
    </div>
  );
}
