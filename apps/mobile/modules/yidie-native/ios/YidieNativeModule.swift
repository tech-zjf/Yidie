import ExpoModulesCore
import Photos
import PhotosUI
import UIKit

public class YidieNativeModule: Module {
  private var backupPicker: BackupDocumentPickerDelegate?
  private var shareController: UIActivityViewController?

  private func reject(_ error: Error, _ promise: Promise) {
    let code = (error as? YidieError)?.code ?? ((error as NSError).code == NSFileWriteOutOfSpaceError ? "INSUFFICIENT_STORAGE" : "PROCESSING_FAILED")
    promise.reject(code, code)
  }

  public func definition() -> ModuleDefinition {
    Name("YidieNative")
    Function("capabilities") { () -> [String: Any] in
      #if targetEnvironment(simulator)
      let simulator = true
      #else
      let simulator = false
      #endif
      return ["simulator": simulator, "minimumIOS": 17]
    }
    AsyncFunction("prepareStorage") { (promise: Promise) in
      NativeFileStore.queue.async {
        do {
          try LocalBackup.recoverIfNeeded()
          let root = try NativeFileStore.root()
          promise.resolve(["rootUri": root.absoluteString + (root.absoluteString.hasSuffix("/") ? "" : "/"), "databaseUri": root.appendingPathComponent("database", isDirectory: true).absoluteString])
        } catch { self.reject(error, promise) }
      }
    }
    AsyncFunction("requestPermission") { (promise: Promise) in
      PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
        promise.resolve(Self.permissionName(status))
      }
    }
    Function("permissionStatus") { () -> String in
      Self.permissionName(PHPhotoLibrary.authorizationStatus(for: .readWrite))
    }
    AsyncFunction("chooseDate") { (currentDate: String?, promise: Promise) in
      DispatchQueue.main.async {
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("DATE_PICKER_UNAVAILABLE", "DATE_PICKER_UNAVAILABLE")
          return
        }
        let picker = YidieDatePickerController(currentDate: currentDate) { date in
          promise.resolve(date)
        }
        picker.modalPresentationStyle = .pageSheet
        picker.isModalInPresentation = true
        if let sheet = picker.sheetPresentationController {
          sheet.detents = [.large()]
          sheet.prefersGrabberVisible = true
        }
        presenter.present(picker, animated: true)
      }
    }
    AsyncFunction("exportBackup") { (promise: Promise) in
      NativeFileStore.queue.async {
        do {
          let package = try LocalBackup.createPackage()
          DispatchQueue.main.async {
            guard let presenter = self.appContext?.utilities?.currentViewController() else {
              try? FileManager.default.removeItem(at: package)
              promise.reject("BACKUP_PICKER_UNAVAILABLE", "BACKUP_PICKER_UNAVAILABLE")
              return
            }
            let delegate = BackupDocumentPickerDelegate { result in
              self.backupPicker = nil
              NativeFileStore.queue.async {
                try? FileManager.default.removeItem(at: package)
                switch result {
                case .exported: promise.resolve(true)
                case .cancelled: promise.resolve(false)
                case .selected: promise.reject("BACKUP_PICKER_FAILED", "BACKUP_PICKER_FAILED")
                }
              }
            }
            self.backupPicker = delegate
            delegate.presentExport(package, from: presenter)
          }
        } catch { self.reject(error, promise) }
      }
    }
    AsyncFunction("prepareRestore") { (promise: Promise) in
      DispatchQueue.main.async {
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("BACKUP_PICKER_UNAVAILABLE", "BACKUP_PICKER_UNAVAILABLE")
          return
        }
        let delegate = BackupDocumentPickerDelegate { result in
          self.backupPicker = nil
          switch result {
          case .cancelled: promise.resolve(nil)
          case .exported: promise.reject("BACKUP_PICKER_FAILED", "BACKUP_PICKER_FAILED")
          case .selected(let url):
            NativeFileStore.queue.async {
              let accessed = url.startAccessingSecurityScopedResource()
              defer { if accessed { url.stopAccessingSecurityScopedResource() } }
              do { promise.resolve(try LocalBackup.stageRestore(from: url).dictionary) }
              catch { self.reject(error, promise) }
            }
          }
        }
        self.backupPicker = delegate
        delegate.presentImport(from: presenter)
      }
    }
    AsyncFunction("discardRestore") { (promise: Promise) in
      NativeFileStore.queue.async {
        do { try LocalBackup.discardRestore(); promise.resolve(nil) }
        catch { self.reject(error, promise) }
      }
    }
    AsyncFunction("activateRestore") { (promise: Promise) in
      NativeFileStore.queue.async {
        do { try LocalBackup.activateRestore(); promise.resolve(nil) }
        catch { self.reject(error, promise) }
      }
    }
    AsyncFunction("shareSticker") { (id: String, revision: Int, promise: Promise) in
      NativeFileStore.queue.async {
        do {
          let url = try NativeFileStore.file(id, kind: "sticker", styleRevision: revision)
          guard FileManager.default.fileExists(atPath: url.path) else { throw YidieError(code: "EXPORT_IMAGE_MISSING") }
          DispatchQueue.main.async { self.presentShare(url, temporary: false, promise: promise) }
        } catch { self.reject(error, promise) }
      }
    }
    AsyncFunction("shareMonth") { (payload: [String: Any], promise: Promise) in
      NativeFileStore.queue.async {
        do {
          let url = try CalendarExporter.render(payload)
          DispatchQueue.main.async { self.presentShare(url, temporary: true, promise: promise) }
        } catch { self.reject(error, promise) }
      }
    }
    AsyncFunction("presentLimitedLibraryPicker") { (promise: Promise) in
      DispatchQueue.main.async {
        guard PHPhotoLibrary.authorizationStatus(for: .readWrite) == .limited,
              let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("PHOTO_PERMISSION_UNAVAILABLE", "PHOTO_PERMISSION_UNAVAILABLE")
          return
        }
        PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: presenter) { _ in
          promise.resolve(nil)
        }
      }
    }
    AsyncFunction("listPhotos") { (offset: Int, limit: Int) in try LocalPhotos.list(offset: offset, limit: limit) }
    AsyncFunction("thumbnail") { (id: String, promise: Promise) in
      LocalPhotos.thumbnail(id) { result in
        switch result { case .success(let uri): promise.resolve(uri); case .failure(let error): self.reject(error, promise) }
      }
    }
    AsyncFunction("importPhoto") { (id: String, promise: Promise) in
      LocalPhotos.read(id) { result in
        switch result { case .success(let photo): promise.resolve(photo); case .failure(let error): self.reject(error, promise) }
      }
    }
    AsyncFunction("createSticker") { (id: String, promise: Promise) in
      NativeFileStore.queue.async {
        autoreleasepool {
          do { promise.resolve(try StickerProcessor.create(id: id)) }
          catch { self.reject(error, promise) }
        }
      }
    }
    AsyncFunction("renderStickerStyle") { (id: String, revision: Int, borderWidth: Double, borderColor: String, promise: Promise) in
      NativeFileStore.queue.async {
        autoreleasepool {
          do { promise.resolve(try StickerProcessor.renderStyle(id: id, revision: revision, borderWidth: borderWidth, borderColor: borderColor)) }
          catch { self.reject(error, promise) }
        }
      }
    }
    AsyncFunction("discardStickerStyleVersion") { (id: String, revision: Int, promise: Promise) in
      NativeFileStore.queue.async {
        do { try NativeFileStore.discardStyleVersion(id, revision: revision); promise.resolve(nil) }
        catch { self.reject(error, promise) }
      }
    }
    AsyncFunction("pruneStickerStyles") { (id: String, keepingRevision: Int, promise: Promise) in
      NativeFileStore.queue.async {
        do { try NativeFileStore.pruneStickerStyles(id, keeping: keepingRevision); promise.resolve(nil) }
        catch { self.reject(error, promise) }
      }
    }
    AsyncFunction("createPhotoPreview") { (id: String, promise: Promise) in
      NativeFileStore.queue.async {
        autoreleasepool {
          do { promise.resolve(try PhotoPreview.create(id: id).dictionary) }
          catch { self.reject(error, promise) }
        }
      }
    }
    AsyncFunction("listImportIDs") { (promise: Promise) in
      NativeFileStore.queue.async {
        do { promise.resolve(try ImageFileCatalog(root: NativeFileStore.root()).importIDs()) }
        catch { self.reject(error, promise) }
      }
    }
    AsyncFunction("discardImport") { (id: String, promise: Promise) in
      NativeFileStore.queue.async {
        do { try NativeFileStore.discard(id); promise.resolve(nil) }
        catch { self.reject(error, promise) }
      }
    }
  }

  private static func permissionName(_ status: PHAuthorizationStatus) -> String {
    switch status {
    case .authorized: return "authorized"
    case .limited: return "limited"
    default: return "denied"
    }
  }

  private func presentShare(_ url: URL, temporary: Bool, promise: Promise) {
    guard shareController == nil,
          let presenter = appContext?.utilities?.currentViewController() else {
      if temporary { try? FileManager.default.removeItem(at: url) }
      promise.reject(shareController == nil ? "SHARE_UNAVAILABLE" : "SHARE_IN_PROGRESS", "SHARE_UNAVAILABLE")
      return
    }
    let controller = UIActivityViewController(activityItems: [url], applicationActivities: nil)
    controller.completionWithItemsHandler = { [weak self] _, completed, _, error in
      self?.shareController = nil
      if temporary { try? FileManager.default.removeItem(at: url) }
      if let error { promise.reject("SHARE_FAILED", error.localizedDescription) }
      else { promise.resolve(completed) }
    }
    if let popover = controller.popoverPresentationController {
      popover.sourceView = presenter.view
      popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 0, height: 0)
    }
    shareController = controller
    presenter.present(controller, animated: true)
  }
}
