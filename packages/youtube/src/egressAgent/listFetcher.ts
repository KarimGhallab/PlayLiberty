import type {
  FetchTrackRequest,
  FetchedTrack,
  IEgressAgentClient,
  ISourceFetcher,
  YoutubeSource
} from '../types.js';

/*
 * Listing through the egress agent, bytes through the local tool. Ticket 04
 * only tunnels the call that gets a bot check; ticket 05 moves the fetch too.
 */
export class EgressListFetcher implements ISourceFetcher {
  constructor(
    private readonly _agent: IEgressAgentClient,
    private readonly _local: ISourceFetcher
  ) {}

  public listSource(url: string): Promise<YoutubeSource> {
    return this._agent.list(url);
  }

  public fetchTrack(request: FetchTrackRequest): Promise<FetchedTrack> {
    return this._local.fetchTrack(request);
  }
}
