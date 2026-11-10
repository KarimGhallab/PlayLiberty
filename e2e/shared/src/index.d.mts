export interface ScenarioEntry {
  videoId: string;
  title: string;
  durationSeconds?: number;
}

export interface ScenarioSource {
  title?: string;
  entries: ScenarioEntry[];
}

export interface Scenario {
  sources: Record<string, ScenarioSource>;
  downloads?: Record<string, 'ok' | 'fail' | 'gone'>;
  /** Slows a successful download so a test can watch the states. */
  downloadDelayMs?: number;
  /** The audio file's real length, so a seek is measurable. */
  audioFixture?: 'short' | 'long';
}

/* `validateYoutubeUrl` accepts a ten-plus-character URL-safe id and the fake
 * maps the extracted id to the scenario's source. */
export function playlistUrl(sourceId: string): string;

/* The add-a-track dialog takes a video, and the fake keys its scenario by the
 * `v` parameter. */
export function videoUrl(videoId: string): string;
