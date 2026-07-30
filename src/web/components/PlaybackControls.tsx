import type { CSSProperties } from "react";
import { Button, Slider, Tooltip } from "@mantine/core";
import { formatRelativeTime, type TimelineMarker } from "../map/temporal";

const marks = [
  { value: 0, label: "24h ago" },
  { value: 6, label: "18h" },
  { value: 12, label: "12h" },
  { value: 18, label: "6h" },
  { value: 24, label: "Now" },
];

export function PlaybackControls({
  time,
  timestamp,
  playing,
  onTimeChange,
  onPlayingChange,
  markers,
  onMarkerSelect,
}: {
  time: number;
  timestamp: string;
  playing: boolean;
  onTimeChange: (time: number) => void;
  onPlayingChange: (playing: boolean) => void;
  markers: readonly TimelineMarker[];
  onMarkerSelect: (marker: TimelineMarker) => void;
}) {
  return (
    <div className="playback-controls" aria-label="24-hour map playback">
      <div className="playback-controls__status" aria-live="polite">
        <strong>{formatRelativeTime(time)}</strong>
        <span>{timestamp} UTC</span>
      </div>
      <Button
        className="playback-controls__play"
        variant="subtle"
        color="gray"
        onClick={() => onPlayingChange(!playing)}
      >
        {playing ? "Pause" : "Play"}
      </Button>
      <div className="playback-controls__timeline">
        <Slider
          className="playback-controls__slider"
          thumbLabel="Time during the last 24 hours"
          min={0}
          max={24}
          step={0.025}
          value={time}
          marks={marks}
          label={formatRelativeTime}
          onChange={(value) => {
            onPlayingChange(false);
            onTimeChange(value);
          }}
        />
        <div className="playback-controls__markers" aria-label="Observed timeline events">
          {markers.map((marker) => (
            <Tooltip key={marker.id} label={marker.label} position="top" withArrow>
              <button
                type="button"
                aria-label={marker.label}
                className="playback-controls__marker"
                style={{ "--timeline-position": `${marker.step / 24 * 100}%` } as CSSProperties}
                onClick={() => onMarkerSelect(marker)}
              />
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}
