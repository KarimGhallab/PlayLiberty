package dev.playliberty.backgroundplayback

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BackgroundPlaybackModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BackgroundPlayback")

    Events("onCommand")

    OnCreate {
      BackgroundPlaybackEvents.listener = { command ->
        sendEvent("onCommand", mapOf("command" to command))
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
      playLabel = map["playLabel"]?.toString() ?: "Play",
      pauseLabel = map["pauseLabel"]?.toString() ?: "Pause",
      channelName = map["channelName"]?.toString() ?: "Playback"
    )
  }
}
