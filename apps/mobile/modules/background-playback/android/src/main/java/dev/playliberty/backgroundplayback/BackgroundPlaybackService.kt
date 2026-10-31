package dev.playliberty.backgroundplayback

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.media.app.NotificationCompat.MediaStyle
import java.net.HttpURLConnection
import java.net.URL

class BackgroundPlaybackService : Service() {
  companion object {
    private const val CHANNEL_ID = "playliberty_playback"
    private const val NOTIFICATION_ID = 0x504C
    private const val ACTION_START = "dev.playliberty.backgroundplayback.START"
    private const val ACTION_UPDATE = "dev.playliberty.backgroundplayback.UPDATE"
    private const val ACTION_TOGGLE = "dev.playliberty.backgroundplayback.TOGGLE"
    private const val ACTION_PREVIOUS = "dev.playliberty.backgroundplayback.PREVIOUS"
    private const val ACTION_NEXT = "dev.playliberty.backgroundplayback.NEXT"

    fun start(context: Context) {
      val intent = Intent(context, BackgroundPlaybackService::class.java)
        .setAction(ACTION_START)
      ContextCompat.startForegroundService(context, intent)
    }

    fun update(context: Context) {
      val intent = Intent(context, BackgroundPlaybackService::class.java)
        .setAction(ACTION_UPDATE)
      context.startService(intent)
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, BackgroundPlaybackService::class.java))
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private var session: MediaSessionCompat? = null
  private var state: BackgroundPlaybackState? = null
  private var artwork: Bitmap? = null
  private var artworkUrl: String = ""
  private var artworkHeaders: Map<String, String> = emptyMap()
  private var artworkThread: Thread? = null
  private var notificationKey: String? = null

  override fun onCreate() {
    super.onCreate()

    val created = MediaSessionCompat(this, "PlayLibertyBackground").apply {
      setFlags(
        MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
          MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
      )
      setCallback(object : MediaSessionCompat.Callback() {
        override fun onPlay() {
          BackgroundPlaybackEvents.command("play")
        }

        override fun onPause() {
          BackgroundPlaybackEvents.command("pause")
        }

        override fun onSkipToNext() {
          BackgroundPlaybackEvents.command("next")
        }

        override fun onSkipToPrevious() {
          BackgroundPlaybackEvents.command("previous")
        }

        override fun onSeekTo(pos: Long) {
          BackgroundPlaybackEvents.command("seek", pos / 1000.0)
        }
      })
      isActive = true
    }

    session = created
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START, ACTION_UPDATE -> {
        state = BackgroundPlaybackStateHolder.state

        if (state == null) {
          stopSelf()
          return START_NOT_STICKY
        }

        applyState()
      }

      ACTION_TOGGLE -> BackgroundPlaybackEvents.command("toggle")
      ACTION_PREVIOUS -> BackgroundPlaybackEvents.command("previous")
      ACTION_NEXT -> BackgroundPlaybackEvents.command("next")
    }

    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    artworkThread?.interrupt()
    artworkThread = null
    session?.isActive = false
    session?.release()
    session = null
    stopForegroundCompat()
    super.onDestroy()
  }

  private fun applyState() {
    val current = state ?: return

    createChannel(current.channelName)
    updateSession(current)
    loadArtwork(current)

    val key = stateKey(current)

    if (key == notificationKey) {
      return
    }

    notificationKey = key
    startForegroundCompat(buildNotification(current))
  }

  private fun updateSession(current: BackgroundPlaybackState) {
    val session = this.session ?: return
    val durationMs = (current.durationSeconds * 1000).toLong().coerceAtLeast(0)
    val metadata = MediaMetadataCompat.Builder()
      .putString(MediaMetadataCompat.METADATA_KEY_TITLE, current.title)
      .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_TITLE, current.title)
      .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, current.playlistName)
      .putString(
        MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE,
        current.playlistName
      )
      .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, current.playlistName)
      .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs)
      .apply {
        artwork?.let { putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, it) }
      }
      .build()
    var actions = PlaybackStateCompat.ACTION_PLAY_PAUSE

    if (durationMs > 0) {
      actions = actions or PlaybackStateCompat.ACTION_SEEK_TO
    }

    if (current.canPrevious) {
      actions = actions or PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
    }

    if (current.canNext) {
      actions = actions or PlaybackStateCompat.ACTION_SKIP_TO_NEXT
    }

    val positionMs = (current.positionSeconds * 1000).toLong().coerceAtLeast(0)
    val playback = PlaybackStateCompat.Builder()
      .setActions(actions)
      .setState(
        if (current.isPlaying) PlaybackStateCompat.STATE_PLAYING
        else PlaybackStateCompat.STATE_PAUSED,
        positionMs,
        if (current.isPlaying) 1f else 0f
      )
      .build()

    session.setMetadata(metadata)
    session.setPlaybackState(playback)
  }

  private fun stateKey(current: BackgroundPlaybackState): String =
    listOf(
      current.title,
      current.playlistName,
      current.isPlaying,
      current.canNext,
      current.artworkUrl,
      current.playLabel,
      current.pauseLabel,
      current.previousLabel,
      current.nextLabel,
      current.channelName
    ).joinToString("|")

  private fun loadArtwork(current: BackgroundPlaybackState) {
    if (current.artworkUrl == artworkUrl) {
      return
    }

    artworkUrl = current.artworkUrl
    artworkHeaders = current.artworkHeaders
    artwork = null
    artworkThread?.interrupt()
    artworkThread = null

    if (artworkUrl.isBlank()) {
      return
    }

    val loadingUrl = artworkUrl
    val loadingHeaders = artworkHeaders

    artworkThread = Thread {
      val bitmap = download(loadingUrl, loadingHeaders)

      handler.post {
        if (artworkUrl == loadingUrl) {
          artwork = bitmap
          notificationKey = null
          applyState()
        }
      }
    }.also { it.start() }
  }

  private fun download(url: String, headers: Map<String, String>): Bitmap? {
    var connection: HttpURLConnection? = null

    return try {
      connection = URL(url).openConnection() as HttpURLConnection
      connection.connectTimeout = 5000
      connection.readTimeout = 5000
      headers.forEach { (name, value) ->
        connection.setRequestProperty(name, value)
      }
      connection.connect()
      BitmapFactory.decodeStream(connection.inputStream)
    } catch (_: Exception) {
      null
    } finally {
      connection?.disconnect()
    }
  }

  private fun createChannel(name: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val manager = getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      CHANNEL_ID,
      name,
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
    }

    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(current: BackgroundPlaybackState): Notification? {
    val session = this.session ?: return null
    val actions = mutableListOf<NotificationCompat.Action>()
    val compact = mutableListOf<Int>()
    val toggle = PendingIntent.getService(
      this,
      0,
      Intent(this, BackgroundPlaybackService::class.java).setAction(ACTION_TOGGLE),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val content = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(
        this,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    if (current.canPrevious) {
      actions += NotificationCompat.Action(
        android.R.drawable.ic_media_previous,
        current.previousLabel,
        PendingIntent.getService(
          this,
          1,
          Intent(this, BackgroundPlaybackService::class.java)
            .setAction(ACTION_PREVIOUS),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      )
      compact += 0
    }

    val toggleIndex = actions.size

    actions += NotificationCompat.Action(
      if (current.isPlaying) android.R.drawable.ic_media_pause
      else android.R.drawable.ic_media_play,
      if (current.isPlaying) current.pauseLabel else current.playLabel,
      toggle
    )
    compact += toggleIndex

    if (current.canNext) {
      actions += NotificationCompat.Action(
        android.R.drawable.ic_media_next,
        current.nextLabel,
        PendingIntent.getService(
          this,
          2,
          Intent(this, BackgroundPlaybackService::class.java).setAction(ACTION_NEXT),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      )
      compact += actions.size - 1
    }

    val style = MediaStyle()
      .setMediaSession(session.sessionToken)
      .setShowActionsInCompactView(*compact.toIntArray())
    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(current.title)
      .setSubText(current.playlistName)
      .setLargeIcon(artwork)
      .setContentIntent(content)
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setShowWhen(false)
      .setOngoing(false)
      .setStyle(style)

    actions.forEach { builder.addAction(it) }

    return builder.build()
  }

  private fun startForegroundCompat(notification: Notification?) {
    if (notification == null) {
      return
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun stopForegroundCompat() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
  }
}
