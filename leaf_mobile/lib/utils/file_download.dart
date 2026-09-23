// lib/utils/file_download.dart
//
// BAGO: iisang function lang ang tinatawag ng ibang screens
// (`saveAndShareBytes`), pero magkaiba ang totoong ginagamit na
// implementation depende sa platform:
//   - Mobile/Desktop (may `dart:io`) → file_download_io.dart
//     (path_provider para sa temp folder + share_plus para sa
//     native share/save sheet)
//   - Web (may `dart:html`, walang `dart:io`) → file_download_web.dart
//     (walang file system sa browser — Blob + <a download> na lang
//     ang paraan, tulad ng ginagawa ng React web version)
//
// `dart:io` ay hindi pwedeng i-import sa Flutter Web build (compile
// error), at `getTemporaryDirectory()` ay walang implementation doon
// kahit payagan mo — kaya kailangan ng conditional import: pinipili
// ni Dart, sa COMPILE TIME (hindi runtime), kung alin sa dalawang file
// ang gagamitin base sa available na libraries ng target platform.
export 'file_download_stub.dart'
    if (dart.library.io) 'file_download_io.dart'
    if (dart.library.html) 'file_download_web.dart';