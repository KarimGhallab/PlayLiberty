import type {
  AgentFetchRequest,
  DownloadOptions,
  FetchTrackRequest,
  FetchedTrack,
  IEgressAgentClient,
  ISourceFetcher,
  YoutubeSource
} from '../types.js';

/*
 * Both source calls through the egress agent. The server owns the download
 * options and hands them to the agent per request; the stored-file contract
 * (remux, probe, rename) stays on this side of the socket.
 */
export class EgressAgentFetcher implements ISourceFetcher {
  constructor(
    private readonly _agent: IEgressAgentClient,
    private readonly _download: DownloadOptions,
    private readonly _timeoutMs: number
  ) {}

  public listSource(url: string): Promise<YoutubeSource> {
    return this._agent.list(url);
  }

  public fetchTrack(request: FetchTrackRequest): Promise<FetchedTrack> {
    const agentRequest: AgentFetchRequest = {
      ...request,
      download: this._download,
      timeoutMs: this._timeoutMs
    };

    return this._agent.fetchTrack(agentRequest);
  }
}
