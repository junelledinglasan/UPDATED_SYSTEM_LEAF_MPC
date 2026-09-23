// lib/utils/file_download_stub.dart
// Fallback lang ito kung sakaling wala man lang dart:io o dart:html
// (hindi dapat mangyari sa totoong Flutter target — mobile, desktop,
// o web ay palaging may isa sa dalawa). Kung na-reach ito, malinaw
// na sasabihin sa user kung ano ang nangyari sa halip na tahimik na
// mag-crash.
Future<void> saveAndShareBytes(List<int> bytes, String fileName, {String? shareText}) async {
  throw UnsupportedError('File download is not supported on this platform.');
}