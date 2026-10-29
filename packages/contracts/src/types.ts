import { z } from 'zod';

import {
  AccountSchema,
  AccountSummaryPageSchema,
  AccountSummarySchema,
  AddTrackInputSchema,
  AddTrackResultSchema,
  CreatePlaylistInputSchema,
  EgressConfigSchema,
  EgressReadSchema,
  ExchangeInputSchema,
  LiveEventSchema,
  MobileTokenSchema,
  PageQuerySchema,
  PinPlaylistInputSchema,
  PlaylistAccessSchema,
  PlaylistPageSchema,
  PlaylistSchema,
  PlaylistTrackListSchema,
  PlaylistTrackSchema,
  PlaylistTracksPageSchema,
  PlaylistTracksQuerySchema,
  PlaylistWithCountsSchema,
  ProblemSchema,
  ProvisionQuerySchema,
  RenamePlaylistInputSchema,
  SharePlaylistInputSchema,
  ShareSchema,
  SkipNonMusicInputSchema,
  SortPlaylistInputSchema,
  SyncRunSchema,
  TrackFileStatusCountsSchema,
  TrackSchema
} from './schemas.js';

export type Account = z.infer<typeof AccountSchema>;
export type AccountSummary = z.infer<typeof AccountSummarySchema>;
export type AccountSummaryPage = z.infer<typeof AccountSummaryPageSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type Playlist = z.infer<typeof PlaylistSchema>;
export type PlaylistWithCounts = z.infer<typeof PlaylistWithCountsSchema>;
export type PlaylistAccess = z.infer<typeof PlaylistAccessSchema>;
export type PlaylistTrack = z.infer<typeof PlaylistTrackSchema>;
export type PlaylistTrackList = z.infer<typeof PlaylistTrackListSchema>;
export type PlaylistTracksPage = z.infer<typeof PlaylistTracksPageSchema>;
export type PlaylistPage = z.infer<typeof PlaylistPageSchema>;
export type PlaylistTracksQuery = z.infer<typeof PlaylistTracksQuerySchema>;
export type TrackFileStatusCounts = z.infer<typeof TrackFileStatusCountsSchema>;
export type Share = z.infer<typeof ShareSchema>;
export type SyncRun = z.infer<typeof SyncRunSchema>;
export type Problem = z.infer<typeof ProblemSchema>;
export type LiveEvent = z.infer<typeof LiveEventSchema>;
export type CreatePlaylistInput = z.infer<typeof CreatePlaylistInputSchema>;
export type AddTrackInput = z.infer<typeof AddTrackInputSchema>;
export type AddTrackResult = z.infer<typeof AddTrackResultSchema>;
export type RenamePlaylistInput = z.infer<typeof RenamePlaylistInputSchema>;
export type SharePlaylistInput = z.infer<typeof SharePlaylistInputSchema>;
export type SkipNonMusicInput = z.infer<typeof SkipNonMusicInputSchema>;
export type SortPlaylistInput = z.infer<typeof SortPlaylistInputSchema>;
export type PinPlaylistInput = z.infer<typeof PinPlaylistInputSchema>;
export type PageQuery = z.infer<typeof PageQuerySchema>;
export type ProvisionQuery = z.infer<typeof ProvisionQuerySchema>;
export type ExchangeInput = z.infer<typeof ExchangeInputSchema>;
export type MobileToken = z.infer<typeof MobileTokenSchema>;
export type EgressConfig = z.infer<typeof EgressConfigSchema>;
export type EgressRead = z.infer<typeof EgressReadSchema>;

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
