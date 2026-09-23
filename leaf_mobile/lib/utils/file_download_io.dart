// lib/utils/file_download_io.dart
// Mobile (Android/iOS) at Desktop — meron talagang file system, kaya
// sine-save muna sa temp directory ng device (path_provider), tapos
// ipinapakita ang native share/save sheet (share_plus) para malaman
// ng user kung saan ise-save o kanino ipapadala ang file.
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

Future<void> saveAndShareBytes(List<int> bytes, String fileName, {String? shareText}) async {
  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}/$fileName');
  await file.writeAsBytes(bytes, flush: true);
  await Share.shareXFiles([XFile(file.path)], text: shareText);
}