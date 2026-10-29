import Foundation
import CoreLocation

/// Append-only storage for walk traces.
///
/// Each walk is one JSON Lines file at Documents/walks/<walkId>.jsonl. Every line is
/// either a raw location fix or a marker (start, resume, stop). Nothing is filtered
/// here: the raw trace is the source of truth and filtering happens at read time.
///
/// The open walk is recorded in Documents/walks/active.json so recording can resume
/// after the app is terminated.
final class TraceStore {
  static let shared = TraceStore()

  struct ActiveWalk: Codable {
    let walkId: String
    let startedAt: Double
  }

  private let queue = DispatchQueue(label: "com.miguelaguerrero.chronicles.tracestore")
  private var handle: FileHandle?
  private var handleWalkId: String?
  private(set) var pointCount = 0

  private var walksDirectory: URL {
    let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    let dir = docs.appendingPathComponent("walks", isDirectory: true)
    if !FileManager.default.fileExists(atPath: dir.path) {
      try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }
    return dir
  }

  private var activeFile: URL { walksDirectory.appendingPathComponent("active.json") }

  func traceURL(for walkId: String) -> URL {
    walksDirectory.appendingPathComponent("\(walkId).jsonl")
  }

  // MARK: Active walk state

  func readActiveWalk() -> ActiveWalk? {
    queue.sync {
      guard let data = try? Data(contentsOf: activeFile) else { return nil }
      return try? JSONDecoder().decode(ActiveWalk.self, from: data)
    }
  }

  func writeActiveWalk(_ walk: ActiveWalk) {
    queue.sync {
      if let data = try? JSONEncoder().encode(walk) {
        try? data.write(to: activeFile, options: .atomic)
      }
    }
  }

  func clearActiveWalk() {
    queue.sync {
      try? FileManager.default.removeItem(at: activeFile)
    }
  }

  // MARK: Appending

  func appendMarker(_ marker: String, walkId: String) {
    let line: [String: Any] = ["t": Date().timeIntervalSince1970 * 1000, "mark": marker]
    append(line, walkId: walkId, countsAsPoint: false)
  }

  /// Appends a fix and returns it as a dictionary suitable for sending to JavaScript.
  @discardableResult
  func appendLocation(_ location: CLLocation, walkId: String) -> [String: Any] {
    let point = TraceStore.dictionary(from: location)
    append(point, walkId: walkId, countsAsPoint: true)
    return point
  }

  static func dictionary(from location: CLLocation) -> [String: Any] {
    var point: [String: Any] = [
      "t": location.timestamp.timeIntervalSince1970 * 1000,
      "lat": location.coordinate.latitude,
      "lon": location.coordinate.longitude,
      "acc": location.horizontalAccuracy,
      "alt": location.altitude,
      "altAcc": location.verticalAccuracy,
      "speed": location.speed,
      "speedAcc": location.speedAccuracy,
      "course": location.course,
      "courseAcc": location.courseAccuracy,
    ]
    if let floor = location.floor?.level {
      point["floor"] = floor
    }
    return point
  }

  private func append(_ object: [String: Any], walkId: String, countsAsPoint: Bool) {
    queue.sync {
      guard let data = try? JSONSerialization.data(withJSONObject: object) else { return }
      let fileHandle = openHandle(for: walkId)
      fileHandle?.seekToEndOfFile()
      fileHandle?.write(data)
      fileHandle?.write(Data([0x0A]))
      if countsAsPoint { pointCount += 1 }
    }
  }

  private func openHandle(for walkId: String) -> FileHandle? {
    if handleWalkId == walkId, let handle { return handle }
    try? handle?.close()
    let url = traceURL(for: walkId)
    if !FileManager.default.fileExists(atPath: url.path) {
      FileManager.default.createFile(atPath: url.path, contents: nil)
    }
    handle = try? FileHandle(forWritingTo: url)
    handleWalkId = walkId
    pointCount = countPoints(in: url)
    return handle
  }

  func closeHandle() {
    queue.sync {
      try? handle?.close()
      handle = nil
      handleWalkId = nil
    }
  }

  // MARK: Reading

  func readLines(for walkId: String) -> [[String: Any]] {
    queue.sync {
      guard let data = try? Data(contentsOf: traceURL(for: walkId)),
            let text = String(data: data, encoding: .utf8) else { return [] }
      return text.split(separator: "\n").compactMap { line in
        guard let lineData = line.data(using: .utf8) else { return nil }
        return (try? JSONSerialization.jsonObject(with: lineData)) as? [String: Any]
      }
    }
  }

  private func countPoints(in url: URL) -> Int {
    guard let data = try? Data(contentsOf: url),
          let text = String(data: data, encoding: .utf8) else { return 0 }
    return text.split(separator: "\n").filter { !$0.contains("\"mark\"") }.count
  }
}
