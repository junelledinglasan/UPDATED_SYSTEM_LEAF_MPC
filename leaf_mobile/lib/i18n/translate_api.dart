// lib/i18n/translate_api.dart
//
// ── BAGO: auto-translate helper gamit ang MyMemory Translation API
// (libre, walang API key na kailangan) — kaparehong ayos ng web's
// translateApi.js (src/i18n/translateApi.js). Idinaragdag ang "de"
// param (email) para tumaas ang free daily quota mula 5,000 hanggang
// 50,000 words/day, base sa dokumentasyon ng MyMemory. ─────────────────
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

const String _kMyMemoryEndpoint = 'https://api.mymemory.translated.net/get';
const String _kQuotaEmail = 'dinglasanjunelle@gmail.com';

// ── Nire-restrict ang concurrent na tawag papunta sa API (hindi lahat
// ng text sa isang page sabay-sabay tatawag) para hindi ma-rate-limit
// o ma-block ng MyMemory kapag maraming keys na kailangang isalin nang
// sabay (hal. paglipat ng buong page papuntang Filipino). ──────────────
const int _kMaxConcurrent = 4;
int _activeCount = 0;
final List<Future<void> Function()> _queue = [];

void _runQueue() {
  while (_activeCount < _kMaxConcurrent && _queue.isNotEmpty) {
    final job = _queue.removeAt(0);
    _activeCount++;
    job().whenComplete(() {
      _activeCount--;
      _runQueue();
    });
  }
}

Future<T> _enqueue<T>(Future<T> Function() fn) {
  final completer = Completer<T>();
  _queue.add(() async {
    try {
      completer.complete(await fn());
    } catch (e) {
      completer.completeError(e);
    }
  });
  _runQueue();
  return completer.future;
}

Future<String> _rawTranslate(String text, String targetLangCode) async {
  final uri = Uri.parse(_kMyMemoryEndpoint).replace(queryParameters: {
    'q': text,
    'langpair': 'en|$targetLangCode',
    'de': _kQuotaEmail,
  });
  final res = await http.get(uri).timeout(const Duration(seconds: 10));
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Translate API error: ${res.statusCode}');
  }
  final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
  final translated = (data['responseData'] as Map<String, dynamic>?)?['translatedText'];
  if (translated == null || '$translated'.trim().isEmpty) {
    throw Exception('Translate API: walang laman ang sagot');
  }
  return '$translated';
}

// ── translateText(text, targetLangCode) — pinapayagan lang ang isang
// tawag sa API sa bawat pagkakataon dahil sa concurrency queue sa itaas.
// "tl" ang targetLangCode para sa Filipino/Tagalog. ─────────────────────
Future<String> translateText(String text, {String targetLangCode = 'tl'}) async {
  if (text.trim().isEmpty) return text;
  return _enqueue(() => _rawTranslate(text, targetLangCode));
}