import ExpoModulesCore
import Photos

public class YidieNativeModule: Module {
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
          let root = try NativeFileStore.root()
          promise.resolve(["rootUri": root.absoluteString + (root.absoluteString.hasSuffix("/") ? "" : "/"), "databaseUri": root.appendingPathComponent("database", isDirectory: true).absoluteString])
        } catch { self.reject(error, promise) }
      }
    }
    AsyncFunction("requestPermission") { (promise: Promise) in
      PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
        promise.resolve(status == .authorized ? "authorized" : status == .limited ? "limited" : "denied")
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
}
