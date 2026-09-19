// lib/i18n/translation_cache.dart
//
// ── BAGO: persistent na cache ng mga auto-translated na resulta —
// kaparehong ayos ng web's translationCache.js (na gumagamit ng
// localStorage). Dito, ISANG JSON blob lang sa SharedPreferences ang
// ginagamit (hindi hiwa-hiwalay na key bawat translation), para hindi
// bumigat ang prefs storage kahit dumami ang na-cache na keys. Naka-
// load sa memory habang tumatakbo ang app (sync na "get()"), pero
// naka-persist din sa disk (SharedPreferences) para hindi na kailangang
// mag-API-call ulit sa susunod na buksan ng app. ────────────────────────
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class TranslationCache {
  static const String _storageKey = 'leaf_translation_cache_fil';
  static final Map<String, String> _cache = {};
  static bool _loaded = false;

  // ── Tinatawag ito ISANG BESES lang, kasama ng LanguageProvider.load()
  // sa app startup — kinukuha ang lahat ng dating na-auto-translate na
  // resulta mula sa disk papuntang memory. ────────────────────────────
  static Future<void> init() async {
    if (_loaded) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw) as Map<String, dynamic>;
        decoded.forEach((k, v) => _cache[k] = '$v');
      }
    } catch (_) {
      // Ligtas na i-ignore — magsisimula lang tayo sa walang laman na
      // cache, at mag-a-auto-translate ulit ang mga key kung kailangan.
    }
    _loaded = true;
  }

  static String? get(String key) => _cache[key];

  static Future<void> set(String key, String value) async {
    _cache[key] = value;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, jsonEncode(_cache));
    } catch (_) {}
  }
}