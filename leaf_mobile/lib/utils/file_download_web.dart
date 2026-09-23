// lib/utils/file_download_web.dart
// Flutter Web — walang file system ang browser (kaya sira ang
// path_provider dito), kaya Blob + <a download> na lang, katulad
// mismo ng ginagawa ng React web version (URL.createObjectURL +
// isang hidden <a> na pina-click). Awtomatiko itong nagta-trigger ng
// browser's normal na "Save As" / Downloads behavior — walang
// share_plus na kailangan dito.
import 'dart:html' as html;

Future<void> saveAndShareBytes(List<int> bytes, String fileName, {String? shareText}) async {
  final blob = html.Blob([bytes]);
  final url = html.Url.createObjectUrlFromBlob(blob);
  html.AnchorElement(href: url)
    ..setAttribute('download', fileName)
    ..click();
  html.Url.revokeObjectUrl(url);
}