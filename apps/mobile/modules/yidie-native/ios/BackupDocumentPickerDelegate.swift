import UIKit

final class BackupDocumentPickerDelegate: NSObject, UIDocumentPickerDelegate {
  private enum PickerMode: Equatable { case importBackup, exportBackup }
  enum ResultValue {
    case exported
    case selected(URL)
    case cancelled
  }

  private let completion: (ResultValue) -> Void
  private var finished = false
  private var mode: PickerMode = .importBackup

  init(completion: @escaping (ResultValue) -> Void) {
    self.completion = completion
  }

  func presentExport(_ url: URL, from presenter: UIViewController) {
    mode = .exportBackup
    let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
    picker.delegate = self
    presenter.present(picker, animated: true)
  }

  func presentImport(from presenter: UIViewController) {
    mode = .importBackup
    let picker = UIDocumentPickerViewController(forOpeningContentTypes: [LocalBackup.backupType()], asCopy: true)
    picker.delegate = self
    presenter.present(picker, animated: true)
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    guard let url = urls.first else { finish(.cancelled); return }
    _ = controller
    finish(mode == .exportBackup ? .exported : .selected(url))
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    _ = controller
    finish(.cancelled)
  }

  private func finish(_ result: ResultValue) {
    guard !finished else { return }
    finished = true
    completion(result)
  }
}
