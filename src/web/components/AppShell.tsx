import type { ReactNode } from "react";

export function AppShell({
  children,
  liveState = "polling",
}: {
  children: ReactNode;
  liveState?: "live" | "polling" | "offline";
}) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="LENS home">LENS</a>
        <nav aria-label="Primary navigation">
          <a href="#briefing">Today</a>
          <a href="#categories">Categories</a>
          <a href="#method">Method</a>
          <a href="#sources">Sources</a>
        </nav>
        <p className="live-status"><span aria-hidden="true" /> {
          liveState === "live"
            ? "Updating · Live"
            : liveState === "polling"
              ? "Updating · Polling"
              : "Last update"
        }</p>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <p>Open-source world intelligence for everyone.</p>
        <p id="method">Transparent selection · Reproducible scores</p>
        <p id="sources">
          <a href="https://github.com/cosbata/lens">
            LENS source
          </a>
          {" · "}
          <a href="https://github.com/koala73/worldmonitor">
            World Monitor upstream
          </a>
        </p>
      </footer>
    </div>
  );
}
