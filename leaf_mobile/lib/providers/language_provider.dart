// lib/providers/language_provider.dart
//
// ── Language switcher (English/Filipino) para sa member app —
// katumbas ng web's LanguageContext.jsx. Naka-save sa
// SharedPreferences (survives app restart, hindi tulad ng
// PageCache na in-memory lang). ─────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../i18n/translations.dart';
import '../i18n/translate_api.dart';
import '../i18n/translation_cache.dart';

// ── Tinatanggal muna ang mga {placeholder} bago ipadala sa translation
// API (para hindi ito masira o ma-translate mismo ang laman nito), at
// ibinabalik pagkatapos matanggap ang salin. Kaparehong ayos ng web's
// LanguageContext.jsx. ─────────────────────────────────────────────────
final RegExp _kPlaceholderRe = RegExp(r'\{[^}]+\}');

({String safe, List<String> tokens}) _protectPlaceholders(String str) {
  final tokens = <String>[];
  final safe = str.replaceAllMapped(_kPlaceholderRe, (m) {
    tokens.add(m.group(0)!);
    return '@@${tokens.length - 1}@@';
  });
  return (safe: safe, tokens: tokens);
}

String _restorePlaceholders(String str, List<String> tokens) {
  return str.replaceAllMapped(RegExp(r'@@\s*(\d+)\s*@@'), (m) {
    final i = int.tryParse(m.group(1)!) ?? -1;
    return (i >= 0 && i < tokens.length) ? tokens[i] : '';
  });
}

class LanguageProvider extends ChangeNotifier {
  static const String _storageKey = 'leaf_language';

  String _language = 'en';
  String get language => _language;

  bool _loaded = false;
  bool get loaded => _loaded;

  // ── BAGO: keys na kasalukuyang tinatawag sa translation API — iwas
  // double-fetch ng parehong key habang naghihintay pa ng sagot. ──────
  final Set<String> _pending = {};

  // ── Tinatawag ito minsan lang, sa app startup (hal. sa splash
  // screen o sa unang build ng root widget) — kinukuha ang naka-save
  // nang wika bago ipakita ang UI. ────────────────────────────────
  Future<void> load() async {
    if (_loaded) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_storageKey);
      _language = saved == 'fil' ? 'fil' : 'en';
    } catch (_) {
      _language = 'en';
    }
    // ── BAGO: i-load muna ang persisted na auto-translation cache
    // bago markahang "loaded" — para agad available ang mga dating
    // na-auto-translate na resulta sa unang render pa lang. ──────────
    await TranslationCache.init();
    _loaded = true;
    notifyListeners();
  }

  Future<void> setLanguage(String lang) async {
    _language = lang;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, lang);
    } catch (_) {}
  }

  Future<void> toggleLanguage() async {
    await setLanguage(_language == 'en' ? 'fil' : 'en');
  }

  // ── BAGO: kapag walang manual override at wala pa sa cache, tinatawag
  // ito para kumuha ng salin mula sa MyMemory API sa background, i-save
  // sa persistent cache, tapos i-refresh ang UI (notifyListeners) —
  // habang naghihintay, English muna ang ipinapakita (tulad ng web). ────
  void _fetchAndCache(String key, String englishTemplate) {
    if (_pending.contains(key)) return;
    _pending.add(key);
    final protected = _protectPlaceholders(englishTemplate);
    translateText(protected.safe, targetLangCode: 'tl').then((translatedSafe) async {
      final translated = _restorePlaceholders(translatedSafe, protected.tokens);
      await TranslationCache.set(key, translated);
      notifyListeners();
    }).catchError((_) {
      // Walang internet o na-rate-limit ang API — babalik lang muna
      // sa English, susubukan ulit sa susunod na tawag sa key na ito.
    }).whenComplete(() => _pending.remove(key));
  }

  // ── t(key, vars) — kunin ang translation, palitan ang
  // {placeholders} gamit ang vars map. Priyoridad kapag Filipino ang
  // wika: (1) manual na entry sa translations.dart (pinaka-mataas —
  // hindi kailanman babaguhin ng auto-translate), (2) na-cache na
  // resulta mula sa API, (3) kung wala pa, mag-a-auto-translate sa
  // background habang English muna ang ipinapakita — kaparehong 3-tier
  // na ayos ng web's LanguageContext.jsx. ──────────────────────────────
  String t(String key, [Map<String, dynamic>? vars]) {
    final englishTemplate = translations['en']?[key] ?? key;
    String template = englishTemplate;

    if (_language == 'fil') {
      final manualOverride = translations['fil']?[key];
      if (manualOverride != null && manualOverride.isNotEmpty) {
        template = manualOverride;
      } else {
        final cached = TranslationCache.get(key);
        if (cached != null && cached.isNotEmpty) {
          template = cached;
        } else {
          _fetchAndCache(key, englishTemplate);
        }
      }
    }

    String str = template;
    if (vars != null) {
      vars.forEach((k, v) {
        str = str.replaceAll('{$k}', '$v');
      });
    }
    return str;
  }
}