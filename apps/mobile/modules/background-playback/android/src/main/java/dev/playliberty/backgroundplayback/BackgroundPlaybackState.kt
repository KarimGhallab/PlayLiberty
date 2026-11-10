package dev.playliberty.backgroundplayback

data class BackgroundPlaybackState(
  val title: String,
  val playlistName: String,
  val route: String,
  val artworkUrl: String,
  val artworkHeaders: Map<String, String>,
  val isPlaying: Boolean,
  val positionSeconds: Double,
  val durationSeconds: Double,
  val canPrevious: Boolean,
  val canNext: Boolean,
  val playLabel: String,
  val pauseLabel: String,
  val previousLabel: String,
  val nextLabel: String,
  val channelName: String
)

object BackgroundPlaybackStateHolder {
  @Volatile
  var state: BackgroundPlaybackState? = null
}

object BackgroundPlaybackEvents {
  @Volatile
  var listener: ((String, Double?) -> Unit)? = null

  fun command(command: String, positionSeconds: Double? = null) {
    listener?.invoke(command, positionSeconds)
  }
}
