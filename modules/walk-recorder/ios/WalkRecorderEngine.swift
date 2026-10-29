import Foundation
import CoreLocation

/// Owns the live location stream for an open walk.
///
/// Uses the iOS 17 API (`CLLocationUpdate.liveUpdates` plus `CLBackgroundActivitySession`)
/// rather than `CLLocationManager.startUpdatingLocation`, because only the newer API lets
/// iOS relaunch a terminated app to continue a session. The background activity session
/// must be created while the app is in the foreground (the start tap) and re-created
/// immediately at launch when a walk is still open.
final class WalkRecorderEngine {
  static let shared = WalkRecorderEngine()

  /// Called on every stored fix; the module forwards it to JavaScript when JS is running.
  var onLocation: (([String: Any]) -> Void)?
  /// Called when recording starts or stops.
  var onStateChange: (([String: Any]) -> Void)?

  private var session: CLBackgroundActivitySession?
  private var updatesTask: Task<Void, Never>?
  private(set) var activeWalk: TraceStore.ActiveWalk?
  private(set) var lastLocation: [String: Any]?
  private(set) var isStationary = false

  var isRecording: Bool { activeWalk != nil }

  /// Begins a new walk. Must be called from the foreground.
  func start(walkId: String) {
    if let current = activeWalk {
      if current.walkId == walkId { return }
      stop()
    }
    let walk = TraceStore.ActiveWalk(walkId: walkId, startedAt: Date().timeIntervalSince1970 * 1000)
    TraceStore.shared.writeActiveWalk(walk)
    TraceStore.shared.appendMarker("start", walkId: walkId)
    run(walk)
  }

  /// Re-attaches to an open walk after the app was relaunched (by the user or by iOS).
  func resumeIfNeeded() {
    guard activeWalk == nil, let walk = TraceStore.shared.readActiveWalk() else { return }
    TraceStore.shared.appendMarker("resume", walkId: walk.walkId)
    run(walk)
  }

  /// Ends the open walk and returns its id.
  @discardableResult
  func stop() -> String? {
    guard let walk = activeWalk else { return nil }
    updatesTask?.cancel()
    updatesTask = nil
    session?.invalidate()
    session = nil
    TraceStore.shared.appendMarker("stop", walkId: walk.walkId)
    TraceStore.shared.closeHandle()
    TraceStore.shared.clearActiveWalk()
    activeWalk = nil
    lastLocation = nil
    onStateChange?(status())
    return walk.walkId
  }

  func status() -> [String: Any] {
    var result: [String: Any] = [
      "recording": isRecording,
      "pointCount": isRecording ? TraceStore.shared.pointCount : 0,
      "stationary": isStationary,
    ]
    if let walk = activeWalk {
      result["walkId"] = walk.walkId
      result["startedAt"] = walk.startedAt
    }
    if let lastLocation {
      result["lastLocation"] = lastLocation
    }
    return result
  }

  private func run(_ walk: TraceStore.ActiveWalk) {
    activeWalk = walk
    // Keeps the app eligible for background updates and shows the location indicator.
    session = CLBackgroundActivitySession()
    updatesTask = Task { @MainActor [weak self] in
      do {
        for try await update in CLLocationUpdate.liveUpdates(.fitness) {
          if Task.isCancelled { break }
          guard let self else { break }
          self.isStationary = update.isStationary
          guard let location = update.location else { continue }
          let point = TraceStore.shared.appendLocation(location, walkId: walk.walkId)
          self.lastLocation = point
          self.onLocation?(point)
        }
      } catch {
        // The stream ended with an error; the walk stays open and resumes on next launch.
      }
    }
    onStateChange?(status())
  }
}
