package expo.modules.chroniclesaudiodecode

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

// Decodes an audio file to a 16 kHz mono 16-bit PCM WAV (specs/memo-transcripts, MX20). Never compiled or run on a
// device: docs/NATIVE_UNVERIFIED.md.
class ChroniclesAudioDecodeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ChroniclesAudioDecode")

    AsyncFunction("decodeToPcm") { source: String, output: String ->
      val out = File(output.removePrefix("file://"))
      try {
        decode(source.removePrefix("file://"), out)
      } catch (e: Exception) {
        out.delete()
        throw CodedException("DecodeFailed", e.message ?: "The audio cannot be read.", e)
      }
    }
  }

  private fun decode(source: String, out: File) {
    val extractor = MediaExtractor()
    extractor.setDataSource(source)
    var track = -1
    var format: MediaFormat? = null
    for (i in 0 until extractor.trackCount) {
      val f = extractor.getTrackFormat(i)
      if ((f.getString(MediaFormat.KEY_MIME) ?: "").startsWith("audio/")) { track = i; format = f; break }
    }
    if (track < 0 || format == null) throw IllegalStateException("No audio track in the file.")
    extractor.selectTrack(track)
    val codec = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!)
    codec.configure(format, null, null, 0)
    codec.start()

    var rate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
    var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
    val stream = BufferedOutputStream(FileOutputStream(out))
    stream.write(ByteArray(44)) // a placeholder, rewritten once the size is known
    var written = 0L
    var pos = 0.0 // the position of the next 16 kHz sample, in source samples
    var prev = 0.0
    var have = false
    var index = 0L // the index of the source sample being read
    val info = MediaCodec.BufferInfo()
    var inputDone = false
    var outputDone = false
    val one = ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN)
    try {
      while (!outputDone) {
        if (!inputDone) {
          val i = codec.dequeueInputBuffer(10_000)
          if (i >= 0) {
            val buf = codec.getInputBuffer(i)!!
            val n = extractor.readSampleData(buf, 0)
            if (n < 0) {
              codec.queueInputBuffer(i, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              inputDone = true
            } else {
              codec.queueInputBuffer(i, 0, n, extractor.sampleTime, 0)
              extractor.advance()
            }
          }
        }
        val o = codec.dequeueOutputBuffer(info, 10_000)
        if (o == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
          val f = codec.outputFormat
          rate = f.getInteger(MediaFormat.KEY_SAMPLE_RATE)
          channels = f.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
        } else if (o >= 0) {
          val buf = codec.getOutputBuffer(o)!!.order(ByteOrder.LITTLE_ENDIAN)
          buf.position(info.offset)
          buf.limit(info.offset + info.size)
          val step = rate / 16000.0
          while (buf.remaining() >= 2 * channels) {
            var sum = 0
            for (c in 0 until channels) sum += buf.short.toInt()
            val s = sum.toDouble() / channels
            // Linear interpolation: emit every 16 kHz sample that falls between the previous source sample and this one.
            if (have) {
              while (pos <= index) {
                val frac = pos - (index - 1)
                val v = prev + (s - prev) * frac
                one.clear(); one.putShort(v.toInt().coerceIn(-32768, 32767).toShort())
                stream.write(one.array()); written += 2
                pos += step
              }
            } else {
              pos = 0.0
            }
            prev = s; have = true; index++
          }
          codec.releaseOutputBuffer(o, false)
          if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) outputDone = true
        }
      }
    } finally {
      codec.stop(); codec.release(); extractor.release(); stream.close()
    }
    RandomAccessFile(out, "rw").use { f ->
      val h = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
      h.put("RIFF".toByteArray()); h.putInt((36 + written).toInt())
      h.put("WAVE".toByteArray()); h.put("fmt ".toByteArray()); h.putInt(16)
      h.putShort(1); h.putShort(1); h.putInt(16000); h.putInt(32000); h.putShort(2); h.putShort(16)
      h.put("data".toByteArray()); h.putInt(written.toInt())
      f.seek(0); f.write(h.array())
    }
  }
}
