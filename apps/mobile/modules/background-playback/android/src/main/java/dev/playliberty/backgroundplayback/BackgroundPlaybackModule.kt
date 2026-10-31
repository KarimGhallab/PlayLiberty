package dev.playliberty.backgroundplayback

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BackgroundPlaybackModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BackgroundPlayback")

    Events("onCommand")

    OnCreate {
      BackgroundPlaybackEvents.listener = { command, positionSeconds ->
        val body = mutableMapOf<String, Any?>("command" to command)

        if (positionSeconds != null) {
          body["positionSeconds"] = positionSeconds
        }

        sendEvent("onCommand", body)
      }
    }

    OnDestroy {
      BackgroundPlaybackEvents.listener = null
    }

    Function("start") { state: Map<String, Any?> ->
      val context = appContext.reactContext ?: return@Function false
      BackgroundPlaybackStateHolder.state = stateFrom(state)
      BackgroundPlaybackService.start(context)
      true
    }

    Function("update") { state: Map<String, Any?> ->
      val context = appContext.reactContext ?: return@Function
      BackgroundPlaybackStateHolder.state = stateFrom(state)
      BackgroundPlaybackService.update(context)
    }

    Function("stop") {
      appContext.reactContext?.let { context ->
        BackgroundPlaybackService.stop(context)
      }
    }
  }

  private fun stateFrom(map: Map<String, Any?>): BackgroundPlaybackState {
    val headers = (map["artworkHeaders"] as? Map<*, *>)
      ?.entries
      ?.associate { entry -> entry.key.toString() to entry.value.toString() }
      ?: emptyMap()

    return BackgroundPlaybackState(
      title = map["title"]?.toString() ?: "",
      playlistName = map["playlistName"]?.toString() ?: "",
      artworkUrl = map["artworkUrl"]?.toString() ?: "",
      artworkHeaders = headers,
      isPlaying = map["isPlaying"] as? Boolean ?: false,
      positionSeconds = (map["positionSeconds"] as? Number)?.toDouble() ?: 0.0,
      durationSeconds = (map["durationSeconds"] as? Number)?.toDouble() ?: 0.0,
      canPrevious = map["canPrevious"] as? Boolean ?: false,
      canNext = map["canNext"] as? Boolean ?: false,
      playLabel = map["playLabel"]?.toString() ?: "Play",
      pauseLabel = map["pauseLabel"]?.toString() ?: "Pause",
      previousLabel = map["previousLabel"]?.toString() ?: "Previous track",
      nextLabel = map["nextLabel"]?.toString() ?: "Next track",
      channelName = map["channelName"]?.toString() ?: "Playback"
    )
  }
}
