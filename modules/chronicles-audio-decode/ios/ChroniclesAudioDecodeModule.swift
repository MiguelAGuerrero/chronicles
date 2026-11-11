import ExpoModulesCore
import AVFoundation

// Decodes an audio file to a 16 kHz mono 16-bit PCM WAV (specs/memo-transcripts, MX20). Never compiled or run on a
// device: docs/NATIVE_UNVERIFIED.md.
public class ChroniclesAudioDecodeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ChroniclesAudioDecode")

    AsyncFunction("decodeToPcm") { (source: String, output: String) in
      try Self.decode(source: source, output: output)
    }
  }

  private static func url(_ s: String) -> URL {
    return s.hasPrefix("file://") ? (URL(string: s) ?? URL(fileURLWithPath: s)) : URL(fileURLWithPath: s)
  }

  private static func decode(source: String, output: String) throws {
    let outURL = url(output)
    try? FileManager.default.removeItem(at: outURL)
    do {
      let asset = AVURLAsset(url: url(source))
      guard let track = asset.tracks(withMediaType: .audio).first else {
        throw Exception(name: "DecodeFailed", description: "No audio track in the file.")
      }
      let reader = try AVAssetReader(asset: asset)
      let settings: [String: Any] = [
        AVFormatIDKey: kAudioFormatLinearPCM,
        AVSampleRateKey: 16000,
        AVNumberOfChannelsKey: 1,
        AVLinearPCMBitDepthKey: 16,
        AVLinearPCMIsFloatKey: false,
        AVLinearPCMIsBigEndianKey: false,
        AVLinearPCMIsNonInterleaved: false,
      ]
      let out = AVAssetReaderTrackOutput(track: track, outputSettings: settings)
      guard reader.canAdd(out) else { throw Exception(name: "DecodeFailed", description: "The audio cannot be read.") }
      reader.add(out)
      guard reader.startReading() else {
        throw Exception(name: "DecodeFailed", description: reader.error?.localizedDescription ?? "The audio cannot be read.")
      }
      FileManager.default.createFile(atPath: outURL.path, contents: nil)
      let handle = try FileHandle(forWritingTo: outURL)
      defer { try? handle.close() }
      handle.write(header(dataBytes: 0)) // a placeholder, rewritten once the size is known
      var total: UInt32 = 0
      while let buffer = out.copyNextSampleBuffer() {
        guard let block = CMSampleBufferGetDataBuffer(buffer) else { continue }
        let length = CMBlockBufferGetDataLength(block)
        var bytes = Data(count: length)
        bytes.withUnsafeMutableBytes { raw in
          if let base = raw.baseAddress { CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: length, destination: base) }
        }
        handle.write(bytes)
        total += UInt32(length)
      }
      if reader.status == .failed {
        throw Exception(name: "DecodeFailed", description: reader.error?.localizedDescription ?? "The audio cannot be read.")
      }
      try handle.seek(toOffset: 0)
      handle.write(header(dataBytes: total))
    } catch {
      try? FileManager.default.removeItem(at: outURL)
      throw error
    }
  }

  /// A 44-byte WAV header for 16 kHz mono 16-bit PCM.
  private static func header(dataBytes: UInt32) -> Data {
    var d = Data()
    func u32(_ v: UInt32) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 4)) }
    func u16(_ v: UInt16) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 2)) }
    d.append("RIFF".data(using: .ascii)!); u32(36 + dataBytes)
    d.append("WAVE".data(using: .ascii)!)
    d.append("fmt ".data(using: .ascii)!); u32(16); u16(1); u16(1); u32(16000); u32(32000); u16(2); u16(16)
    d.append("data".data(using: .ascii)!); u32(dataBytes)
    return d
  }
}
