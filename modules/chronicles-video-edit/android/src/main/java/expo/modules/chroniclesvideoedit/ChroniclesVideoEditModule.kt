// ChroniclesVideoEdit: renders an edited copy of a video to MP4 with Media3 Transformer.
// NEVER COMPILED OR RUN ON A DEVICE. See ../README.md and docs/NATIVE_UNVERIFIED.md.

package expo.modules.chroniclesvideoedit

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.Crop
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.Presentation
import androidx.media3.effect.ScaleAndRotateTransformation
import androidx.media3.effect.TextureOverlay
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import com.google.common.collect.ImmutableList
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

// region Arguments

class CropRectRecord : Record {
  @Field var x: Double = 0.0
  @Field var y: Double = 0.0
  @Field var w: Double = 0.0
  @Field var h: Double = 0.0
}

class OutSizeRecord : Record {
  @Field var w: Double = 0.0
  @Field var h: Double = 0.0
}

class TrimRecord : Record {
  @Field("start_ms") var startMs: Double = 0.0
  @Field("end_ms") var endMs: Double = 0.0
}

class VideoExportInput : Record {
  @Field var source: String = ""
  @Field var output: String = ""
  @Field var rotate: Int = 0
  @Field var crop: CropRectRecord = CropRectRecord()
  @Field("out") var outSize: OutSizeRecord = OutSizeRecord()
  @Field var trim: TrimRecord? = null
  @Field var overlay: String? = null
}

class VideoExportException(message: String, cause: Throwable? = null) : CodedException(message, cause)

// endregion

@OptIn(UnstableApi::class)
class ChroniclesVideoEditModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())

  // Transformers in flight, touched on the main thread only, so they stay referenced until they finish.
  private val active = mutableSetOf<Transformer>()

  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ChroniclesVideoEdit")

    AsyncFunction("exportEditedVideo") { input: VideoExportInput, promise: Promise ->
      var outputFile: File? = null
      try {
        val output = fileOf(input.output, "output")
        outputFile = output
        val job = prepare(input, output)
        mainHandler.post { start(job, output, input.output, promise) }
      } catch (e: Throwable) {
        outputFile?.delete()
        promise.reject(asExportException(e))
      }
    }
  }

  private class Job(val item: EditedMediaItem)

  /** Validates the input, reads the source's size and builds the edited item (off the main thread). */
  private fun prepare(input: VideoExportInput, output: File): Job {
    if (input.rotate !in setOf(0, 90, 180, 270)) {
      throw VideoExportException("rotate must be 0, 90, 180 or 270, got ${input.rotate}")
    }
    val outW = input.outSize.w
    val outH = input.outSize.h
    if (!outW.isFinite() || !outH.isFinite() || outW < 2 || outH < 2 ||
      outW != Math.rint(outW) || outH != Math.rint(outH) ||
      outW.toInt() % 2 != 0 || outH.toInt() % 2 != 0
    ) {
      throw VideoExportException("out must be even whole pixel sizes of at least 2, got $outW x $outH")
    }
    val outWidth = outW.toInt()
    val outHeight = outH.toInt()
    val c = input.crop
    if (!c.x.isFinite() || !c.y.isFinite() || !c.w.isFinite() || !c.h.isFinite() || c.w <= 0 || c.h <= 0) {
      throw VideoExportException("crop must have a positive width and height, got ${c.w} x ${c.h}")
    }

    val sourceUri = sourceUriOf(input.source)
    val source = readSource(sourceUri)

    // The frame the crop is expressed in: upright (the source's rotation metadata applied),
    // then our clockwise turn.
    val uprightW = if (source.rotation % 180 == 0) source.width else source.height
    val uprightH = if (source.rotation % 180 == 0) source.height else source.width
    val frameW = (if (input.rotate % 180 == 0) uprightW else uprightH).toDouble()
    val frameH = (if (input.rotate % 180 == 0) uprightH else uprightW).toDouble()

    val tolerance = 2.0
    if (c.x < -tolerance || c.y < -tolerance || c.x + c.w > frameW + tolerance || c.y + c.h > frameH + tolerance) {
      throw VideoExportException("The crop ${c.x},${c.y} ${c.w}x${c.h} is outside the ${frameW}x$frameH frame")
    }
    val left = c.x.coerceIn(0.0, frameW)
    val top = c.y.coerceIn(0.0, frameH)
    val right = (c.x + c.w).coerceIn(0.0, frameW)
    val bottom = (c.y + c.h).coerceIn(0.0, frameH)
    if (right - left < 1 || bottom - top < 1) {
      throw VideoExportException("The crop is empty inside the ${frameW}x$frameH frame")
    }

    val mediaItem = MediaItem.Builder().setUri(sourceUri).apply {
      input.trim?.let { trim ->
        if (!trim.startMs.isFinite() || !trim.endMs.isFinite() || trim.startMs < 0 || trim.endMs <= trim.startMs) {
          throw VideoExportException("trim must have 0 <= start_ms < end_ms, got ${trim.startMs}..${trim.endMs}")
        }
        val startMs = Math.round(trim.startMs)
        var endMs = Math.round(trim.endMs)
        if (source.durationMs > 0) {
          if (startMs >= source.durationMs) {
            throw VideoExportException("The trim range is outside the video")
          }
          endMs = endMs.coerceAtMost(source.durationMs)
        }
        setClippingConfiguration(
          MediaItem.ClippingConfiguration.Builder()
            .setStartPositionMs(startMs)
            .setEndPositionMs(endMs)
            .build()
        )
      }
    }.build()

    val videoEffects = mutableListOf<Effect>()
    // 1. Rotate. Media3's ScaleAndRotateTransformation turns COUNTERCLOCKWISE for positive
    //    degrees (its NDC space is y-up), so a clockwise turn r is 360 - r. UNVERIFIED on a device.
    //    Transformer feeds effects frames already made upright by the source's rotation metadata.
    if (input.rotate != 0) {
      videoEffects.add(
        ScaleAndRotateTransformation.Builder()
          .setRotationDegrees(((360 - input.rotate) % 360).toFloat())
          .build()
      )
    }
    // 2. Crop, in normalized device coordinates: x from -1 (left) to 1 (right),
    //    y from -1 (BOTTOM) to 1 (TOP), so the pixel y (top-down) is flipped.
    videoEffects.add(
      Crop(
        (2 * left / frameW - 1).toFloat(),
        (2 * right / frameW - 1).toFloat(),
        (1 - 2 * bottom / frameH).toFloat(),
        (1 - 2 * top / frameH).toFloat()
      )
    )
    // 3. Scale the crop to exactly out (the caller keeps the aspect ratio; stretch makes it exact).
    videoEffects.add(Presentation.createForWidthAndHeight(outWidth, outHeight, Presentation.LAYOUT_STRETCH_TO_FIT))
    // 4. The overlay (drawing + caption), over every frame, after the frame is out-sized.
    input.overlay?.let { overlay ->
      val bitmap = readOverlay(fileOf(overlay, "overlay"), outWidth, outHeight)
      val overlays: ImmutableList<TextureOverlay> = ImmutableList.of(BitmapOverlay.createStaticBitmapOverlay(bitmap))
      videoEffects.add(OverlayEffect(overlays))
    }

    val item = EditedMediaItem.Builder(mediaItem)
      .setEffects(Effects(emptyList(), videoEffects))
      .build()

    output.parentFile?.mkdirs()
    if (output.exists() && !output.delete()) {
      throw VideoExportException("Could not replace the existing output file at ${output.path}")
    }
    return Job(item)
  }

  /** Builds and starts the Transformer. Runs on the main thread: Transformer needs a Looper. */
  private fun start(job: Job, output: File, outputUri: String, promise: Promise) {
    val settled = AtomicBoolean(false)
    var transformer: Transformer? = null

    fun settle(error: Throwable?) {
      if (!settled.compareAndSet(false, true)) {
        return
      }
      transformer?.let { active.remove(it) }
      if (error == null) {
        promise.resolve(outputUri)
      } else {
        output.delete()
        promise.reject(asExportException(error))
      }
    }

    try {
      val built = Transformer.Builder(context)
        .addListener(object : Transformer.Listener {
          override fun onCompleted(composition: Composition, exportResult: ExportResult) {
            settle(null)
          }

          override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
            settle(exportException)
          }
        })
        .build()
      transformer = built
      active.add(built)
      built.start(job.item, output.absolutePath)
    } catch (e: Throwable) {
      settle(e)
    }
  }

  private class SourceInfo(val width: Int, val height: Int, val rotation: Int, val durationMs: Long)

  private fun readSource(uri: Uri): SourceInfo {
    if (uri.scheme == "file") {
      val path = uri.path
      if (path == null || !File(path).exists()) {
        throw VideoExportException("The source video does not exist at ${uri.path}")
      }
    }
    val retriever = MediaMetadataRetriever()
    try {
      retriever.setDataSource(context, uri)
      val width = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull()
      val height = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull()
      val rotation = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
      val duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
      if (width == null || height == null || width <= 0 || height <= 0) {
        throw VideoExportException("The source has no video track")
      }
      return SourceInfo(width, height, ((rotation % 360) + 360) % 360, duration)
    } catch (e: VideoExportException) {
      throw e
    } catch (e: Exception) {
      throw VideoExportException("Could not read the source video: ${e.message}", e)
    } finally {
      try {
        retriever.release()
      } catch (ignored: Exception) {
        // Nothing to do: the metadata was read or the read already failed.
      }
    }
  }

  private fun readOverlay(file: File, width: Int, height: Int): Bitmap {
    val options = BitmapFactory.Options().apply {
      inPreferredConfig = Bitmap.Config.ARGB_8888
      inScaled = false
    }
    val bitmap = BitmapFactory.decodeFile(file.absolutePath, options)
      ?: throw VideoExportException("Could not read the overlay image at ${file.path}")
    if (bitmap.width == width && bitmap.height == height) {
      return bitmap
    }
    return Bitmap.createScaledBitmap(bitmap, width, height, true)
  }

  private fun sourceUriOf(uri: String): Uri {
    if (uri.startsWith("/")) {
      return Uri.fromFile(File(uri))
    }
    val parsed = Uri.parse(uri)
    if (parsed.scheme == "file" || parsed.scheme == "content") {
      return parsed
    }
    throw VideoExportException("The source must be a file:// URI, got '$uri'")
  }

  private fun fileOf(uri: String, what: String): File {
    if (uri.startsWith("/")) {
      return File(uri)
    }
    val parsed = Uri.parse(uri)
    val path = parsed.path
    if (parsed.scheme != "file" || path.isNullOrEmpty()) {
      throw VideoExportException("The $what must be a file:// URI, got '$uri'")
    }
    return File(path)
  }

  private fun asExportException(e: Throwable): CodedException = when (e) {
    is CodedException -> e
    is ExportException -> VideoExportException("The export failed (code ${e.errorCode}): ${e.message}", e)
    else -> VideoExportException("Could not export the edited video: ${e.message}", e)
  }
}
