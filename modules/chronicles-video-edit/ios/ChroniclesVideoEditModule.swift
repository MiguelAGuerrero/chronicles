// ChroniclesVideoEdit: renders an edited copy of a video to MP4 with AVFoundation.
// NEVER COMPILED OR RUN ON A DEVICE. See ../README.md and docs/NATIVE_UNVERIFIED.md.

import AVFoundation
import CoreGraphics
import CoreMedia
import ExpoModulesCore
import ImageIO
import QuartzCore

public class ChroniclesVideoEditModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ChroniclesVideoEdit")

    AsyncFunction("exportEditedVideo") { (input: VideoExportInput) async throws -> String in
      let request = try VideoExportRequest(input)
      try await VideoExporter.export(request)
      return request.outputUri
    }
  }
}

// MARK: - Arguments

internal struct CropRectRecord: Record {
  @Field var x: Double = 0
  @Field var y: Double = 0
  @Field var w: Double = 0
  @Field var h: Double = 0
}

internal struct OutSizeRecord: Record {
  @Field var w: Double = 0
  @Field var h: Double = 0
}

internal struct TrimRecord: Record {
  @Field(.keyed("start_ms")) var startMs: Double = 0
  @Field(.keyed("end_ms")) var endMs: Double = 0
}

internal struct VideoExportInput: Record {
  @Field(.required) var source: String = ""
  @Field(.required) var output: String = ""
  @Field var rotate: Int = 0
  @Field(.required) var crop: CropRectRecord = CropRectRecord()
  @Field(.keyed("out"), .required) var outSize: OutSizeRecord = OutSizeRecord()
  @Field var trim: TrimRecord?
  @Field var overlay: String?
}

internal final class VideoExportException: GenericException<String> {
  override var reason: String {
    param
  }
}

// MARK: - Validated request

/// Plain values copied out of the record, validated once.
internal struct VideoExportRequest {
  let sourceURL: URL
  let outputURL: URL
  let outputUri: String
  let rotate: Int
  let crop: CGRect
  let outSize: CGSize
  let trimStartMs: Double?
  let trimEndMs: Double?
  let overlayURL: URL?

  init(_ input: VideoExportInput) throws {
    sourceURL = try fileURL(input.source, what: "source")
    outputURL = try fileURL(input.output, what: "output")
    outputUri = input.output

    guard [0, 90, 180, 270].contains(input.rotate) else {
      throw VideoExportException("rotate must be 0, 90, 180 or 270, got \(input.rotate)")
    }
    rotate = input.rotate

    let outW = input.outSize.w
    let outH = input.outSize.h
    guard outW.isFinite, outH.isFinite, outW >= 2, outH >= 2,
          outW == outW.rounded(), outH == outH.rounded(),
          Int(outW) % 2 == 0, Int(outH) % 2 == 0 else {
      throw VideoExportException("out must be even whole pixel sizes of at least 2, got \(outW) x \(outH)")
    }
    outSize = CGSize(width: outW, height: outH)

    let c = input.crop
    guard c.x.isFinite, c.y.isFinite, c.w.isFinite, c.h.isFinite, c.w > 0, c.h > 0 else {
      throw VideoExportException("crop must have a positive width and height, got \(c.w) x \(c.h)")
    }
    crop = CGRect(x: c.x, y: c.y, width: c.w, height: c.h)

    if let trim = input.trim {
      guard trim.startMs.isFinite, trim.endMs.isFinite, trim.startMs >= 0, trim.endMs > trim.startMs else {
        throw VideoExportException("trim must have 0 <= start_ms < end_ms, got \(trim.startMs)..\(trim.endMs)")
      }
      trimStartMs = trim.startMs
      trimEndMs = trim.endMs
    } else {
      trimStartMs = nil
      trimEndMs = nil
    }

    if let overlay = input.overlay {
      overlayURL = try fileURL(overlay, what: "overlay")
    } else {
      overlayURL = nil
    }
  }
}

private func fileURL(_ uri: String, what: String) throws -> URL {
  if uri.hasPrefix("/") {
    return URL(fileURLWithPath: uri)
  }
  if uri.hasPrefix("file://") {
    if let url = URL(string: uri), url.isFileURL {
      return url
    }
    // An unencoded path (spaces etc.) that URL(string:) refuses.
    let path = String(uri.dropFirst("file://".count))
    return URL(fileURLWithPath: path.removingPercentEncoding ?? path)
  }
  throw VideoExportException("The \(what) must be a file:// URI, got '\(uri)'")
}

// MARK: - Export

internal enum VideoExporter {
  static func export(_ request: VideoExportRequest) async throws {
    let fileManager = FileManager.default
    guard fileManager.fileExists(atPath: request.sourceURL.path) else {
      throw VideoExportException("The source video does not exist at \(request.sourceURL.path)")
    }
    try? fileManager.createDirectory(
      at: request.outputURL.deletingLastPathComponent(),
      withIntermediateDirectories: true
    )
    if fileManager.fileExists(atPath: request.outputURL.path) {
      do {
        try fileManager.removeItem(at: request.outputURL)
      } catch {
        throw VideoExportException("Could not replace the existing output file: \(error.localizedDescription)")
      }
    }

    do {
      try await render(request)
    } catch {
      // Never leave a partial file behind.
      try? fileManager.removeItem(at: request.outputURL)
      if let exception = error as? VideoExportException {
        throw exception
      }
      throw VideoExportException("Could not export the edited video: \(error.localizedDescription)")
    }
  }

  private static func render(_ request: VideoExportRequest) async throws {
    let asset = AVURLAsset(url: request.sourceURL, options: [AVURLAssetPreferPreciseDurationAndTimingKey: true])
    let duration = try await asset.load(.duration)
    guard let videoTrack = try await asset.loadTracks(withMediaType: .video).first else {
      throw VideoExportException("The source has no video track")
    }
    let audioTracks = try await asset.loadTracks(withMediaType: .audio)
    let (naturalSize, preferredTransform, nominalFrameRate, videoTimeRange) = try await videoTrack.load(
      .naturalSize,
      .preferredTransform,
      .nominalFrameRate,
      .timeRange
    )

    // 1. The time range: the trim, or the whole clip.
    let whole = CMTimeRange(start: .zero, duration: duration)
    var range = whole
    if let startMs = request.trimStartMs, let endMs = request.trimEndMs {
      let start = CMTime(value: CMTimeValue(startMs.rounded()), timescale: 1000)
      let end = CMTime(value: CMTimeValue(endMs.rounded()), timescale: 1000)
      range = CMTimeRange(start: start, end: end).intersection(whole)
    }
    guard range.isValid, !range.isEmpty, range.duration.seconds > 0 else {
      throw VideoExportException("The trim range is outside the video")
    }

    // 2. A composition holding the video and every audio track for that range.
    let composition = AVMutableComposition()
    guard let compositionVideo = composition.addMutableTrack(
      withMediaType: .video,
      preferredTrackID: kCMPersistentTrackID_Invalid
    ) else {
      throw VideoExportException("Could not create the video track of the composition")
    }
    let videoRange = range.intersection(videoTimeRange)
    guard !videoRange.isEmpty else {
      throw VideoExportException("The trim range has no video frames")
    }
    try compositionVideo.insertTimeRange(videoRange, of: videoTrack, at: CMTimeSubtract(videoRange.start, range.start))

    for audioTrack in audioTracks {
      let audioRange = range.intersection(try await audioTrack.load(.timeRange))
      if audioRange.isEmpty {
        continue
      }
      guard let compositionAudio = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
      ) else {
        continue
      }
      try compositionAudio.insertTimeRange(audioRange, of: audioTrack, at: CMTimeSubtract(audioRange.start, range.start))
    }

    // 3. The frame transform: upright, rotate, crop, scale.
    let (uprightTransform, uprightSize) = upright(naturalSize: naturalSize, preferredTransform: preferredTransform)
    let (rotation, rotatedSize) = clockwise(request.rotate, size: uprightSize)
    let crop = try fit(request.crop, in: rotatedSize)
    let transform = uprightTransform
      .concatenating(rotation)
      .concatenating(CGAffineTransform(translationX: -crop.minX, y: -crop.minY))
      .concatenating(CGAffineTransform(scaleX: request.outSize.width / crop.width, y: request.outSize.height / crop.height))

    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize = request.outSize
    let fps: Int32 = nominalFrameRate.isFinite && nominalFrameRate >= 1
      ? min(Int32(nominalFrameRate.rounded()), 120)
      : 30
    videoComposition.frameDuration = CMTime(value: 1, timescale: fps)

    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRange(start: .zero, duration: composition.duration)
    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionVideo)
    layerInstruction.setTransform(transform, at: .zero)
    instruction.layerInstructions = [layerInstruction]
    videoComposition.instructions = [instruction]

    // 4. The overlay (drawing + caption), over every frame.
    if let overlayURL = request.overlayURL {
      videoComposition.animationTool = try overlayTool(overlayURL, size: request.outSize)
    }

    // 5. Export.
    guard let session = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
      throw VideoExportException("Could not create the export session")
    }
    session.videoComposition = videoComposition
    session.shouldOptimizeForNetworkUse = true

    if #available(iOS 18.0, *) {
      try await session.export(to: request.outputURL, as: .mp4)
    } else {
      session.outputURL = request.outputURL
      session.outputFileType = .mp4
      await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
        session.exportAsynchronously {
          continuation.resume()
        }
      }
      switch session.status {
      case .completed:
        return
      case .cancelled:
        throw VideoExportException("The export was cancelled")
      default:
        throw VideoExportException(
          "The export failed: \(session.error?.localizedDescription ?? "unknown error (status \(session.status.rawValue))")"
        )
      }
    }
  }

  /// The source's own orientation, moved back into the positive quadrant.
  /// Composition coordinates are y-down with the origin at the top left.
  private static func upright(naturalSize: CGSize, preferredTransform: CGAffineTransform) -> (CGAffineTransform, CGSize) {
    let bounds = CGRect(origin: .zero, size: naturalSize).applying(preferredTransform)
    let transform = preferredTransform.concatenating(
      CGAffineTransform(translationX: -bounds.minX, y: -bounds.minY)
    )
    let size = CGSize(width: abs(bounds.width).rounded(), height: abs(bounds.height).rounded())
    return (transform, size)
  }

  /// A clockwise turn in y-down coordinates of a w x h frame, translated so the
  /// result stays in the positive quadrant. Written out per angle (no trig) so the
  /// matrices are exact.
  private static func clockwise(_ degrees: Int, size: CGSize) -> (CGAffineTransform, CGSize) {
    let w = size.width
    let h = size.height
    switch degrees {
    case 90:
      // (x, y) -> (h - y, x)
      return (CGAffineTransform(a: 0, b: 1, c: -1, d: 0, tx: h, ty: 0), CGSize(width: h, height: w))
    case 180:
      // (x, y) -> (w - x, h - y)
      return (CGAffineTransform(a: -1, b: 0, c: 0, d: -1, tx: w, ty: h), size)
    case 270:
      // (x, y) -> (y, w - x)
      return (CGAffineTransform(a: 0, b: -1, c: 1, d: 0, tx: 0, ty: w), CGSize(width: h, height: w))
    default:
      return (.identity, size)
    }
  }

  /// The crop, clamped to the frame when it overshoots by rounding (up to 2 px);
  /// rejected when it is really outside.
  private static func fit(_ crop: CGRect, in size: CGSize) throws -> CGRect {
    let tolerance: CGFloat = 2
    guard crop.minX >= -tolerance, crop.minY >= -tolerance,
          crop.maxX <= size.width + tolerance, crop.maxY <= size.height + tolerance else {
      throw VideoExportException(
        "The crop \(crop.minX),\(crop.minY) \(crop.width)x\(crop.height) is outside the \(size.width)x\(size.height) frame"
      )
    }
    let clamped = crop.intersection(CGRect(origin: .zero, size: size))
    guard !clamped.isNull, clamped.width >= 1, clamped.height >= 1 else {
      throw VideoExportException("The crop is empty inside the \(size.width)x\(size.height) frame")
    }
    return clamped
  }

  /// Core Animation layers for the overlay. AVVideoCompositionCoreAnimationTool
  /// renders the layer tree with a bottom-left origin; isGeometryFlipped on the
  /// parent makes it top-left like the PNG. The overlay layer fills the frame, so
  /// only the content's orientation depends on it (UNVERIFIED on a device).
  private static func overlayTool(_ url: URL, size: CGSize) throws -> AVVideoCompositionCoreAnimationTool {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
      throw VideoExportException("Could not read the overlay image at \(url.path)")
    }
    let frame = CGRect(origin: .zero, size: size)

    // Built off the main thread: an explicit transaction so nothing is left uncommitted.
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    let parentLayer = CALayer()
    parentLayer.frame = frame
    parentLayer.isGeometryFlipped = true
    let videoLayer = CALayer()
    videoLayer.frame = frame
    let overlayLayer = CALayer()
    overlayLayer.frame = frame
    overlayLayer.contents = image
    overlayLayer.contentsGravity = .resize
    overlayLayer.contentsScale = 1
    parentLayer.addSublayer(videoLayer)
    parentLayer.addSublayer(overlayLayer)
    CATransaction.commit()

    return AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)
  }
}
