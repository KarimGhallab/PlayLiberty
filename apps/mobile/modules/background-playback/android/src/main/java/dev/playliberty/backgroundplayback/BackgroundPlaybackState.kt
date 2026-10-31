package dev.playliberty.backgroundplayback

data class BackgroundPlaybackState(
  val title: String,
  val playlistName: String,
  val artworkUrl: String,
  val artworkHeaders: Map<String, String>,
  val isPlaying: Boolean,
  val playLabel: String,
  val pauseLabel: String,
  val channelName: String
)

object BackgroundPlaybackStateHolder {
  @Volatile
  var state: BackgroundPlaybackState? = null
}

object BackgroundPlaybackEvents {
  @Volatile
  var listener: ((String) -> Unit)? = null

  fun command(command: String) {
    listener?.invoke(command)
  }
}
