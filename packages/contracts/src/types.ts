import { z } from 'zod';

import {
  AccountSchema,
  AddTrackInputSchema,
  CreatePlaylistInputSchema,
  PageQuerySchema,
  PlaylistAccessSchema,
  PlaylistSchema,
  PlaylistTrackSchema,
  ProblemSchema,
  RenamePlaylistInputSchema,
  SharePlaylistInputSchema,
  ShareSchema,
  SyncRunSchema,
  TrackSchema
} from './schemas.js';

export type Account = z.infer<typeof AccountSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type Playlist = z.infer<typeof PlaylistSchema>;
export type PlaylistAccess = z.infer<typeof PlaylistAccessSchema>;
export type PlaylistTrack = z.infer<typeof PlaylistTrackSchema>;
export type Share = z.infer<typeof ShareSchema>;
export type SyncRun = z.infer<typeof SyncRunSchema>;
export type Problem = z.infer<typeof ProblemSchema>;
export type CreatePlaylistInput = z.infer<typeof CreatePlaylistInputSchema>;
export type AddTrackInput = z.infer<typeof AddTrackInputSchema>;
export type RenamePlaylistInput = z.infer<typeof RenamePlaylistInputSchema>;
export type SharePlaylistInput = z.infer<typeof SharePlaylistInputSchema>;
export type PageQuery = z.infer<typeof PageQuerySchema>;

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
