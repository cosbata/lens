import type { buildStoryThread } from "../../core/cluster/story-thread";

export function StoryThread({
  thread,
  activeEventId,
}: {
  thread: ReturnType<typeof buildStoryThread>;
  activeEventId: string;
}) {
  const related = thread.links.filter(
    ({ fromEventId, toEventId }) =>
      fromEventId === activeEventId || toEventId === activeEventId,
  );
  const title = (id: string) => thread.events.find((event) => event.id === id)?.title ?? id;

  return (
    <section className="story-thread" aria-labelledby="story-thread-title">
      <p className="sidecar-label">Connected developments</p>
      <h3 id="story-thread-title">What this event connects to</h3>
      {related.length === 0 ? (
        <p className="story-thread__empty">
          No verified causal connection has passed the evidence rule yet.
        </p>
      ) : (
        <ol>
          {related.map((link) => (
            <li key={`${link.fromEventId}:${link.relation}:${link.toEventId}`}>
              <p>
                <strong>{title(link.fromEventId)}</strong>
                <span>{link.relation.replaceAll("-", " ")} →</span>
                <strong>{title(link.toEventId)}</strong>
              </p>
              <p>{link.explanation}</p>
              <a href={link.sourceUrl} target="_blank" rel="noreferrer">View linking evidence ↗</a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
