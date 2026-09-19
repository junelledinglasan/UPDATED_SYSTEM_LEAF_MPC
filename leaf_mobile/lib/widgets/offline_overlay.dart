// lib/widgets/offline_overlay.dart
//
// ── BAGO: kaparehong logic ng web's OfflineOverlay.jsx — hindi lang
// basta "may WiFi ba" ang tinitignan, kundi TALAGANG naaabot pa ba
// ang backend server. Kahit anong HTTP status ang isasagot (200, 404,
// atbp.), ibig sabihin naabot ang server, kaya "online" pa rin —
// "Network Error"/timeout lang (walang sagot AT ALL) ang ituturing na
// "offline". Dedicated na "/ping/" endpoint (laging sumasagot ng
// 200 OK, walang login required) ang tinitirahan, gaya ng ginamit na
// rin ng web version.
//
// Naka-mount ito ISANG BESES lang sa MaterialApp's "builder" (tingnan
// ang main.dart), kaya gumagana ito sa LAHAT ng portal
// (Admin/Staff/Member) nang hindi na kailangang idagdag sa bawat
// screen nang hiwalay.
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';

const Duration _kPingInterval = Duration(seconds: 15);
const Duration _kPingTimeout = Duration(seconds: 5);

class OfflineOverlay extends StatefulWidget {
  final Widget child;
  const OfflineOverlay({super.key, required this.child});

  @override
  State<OfflineOverlay> createState() => _OfflineOverlayState();
}

class _OfflineOverlayState extends State<OfflineOverlay> {
  bool _offline = false;
  bool _checking = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // ── Unang check agad pagka-mount, tapos paulit-ulit bawat
    // _kPingInterval. ───────────────────────────────────────────────
    _runPing();
    _timer = Timer.periodic(_kPingInterval, (_) => _runPing());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<bool> _checkConnectivity() async {
    try {
      final base = AppConstants.baseUrl.replaceAll(RegExp(r'/+$'), '');
      final uri = Uri.parse('$base/ping/');
      final res = await http.get(uri).timeout(_kPingTimeout);
      return res.statusCode > 0;
    } catch (_) {
      return false;
    }
  }

  Future<void> _runPing() async {
    final ok = await _checkConnectivity();
    if (mounted) setState(() => _offline = !ok);
  }

  Future<void> _handleRetry() async {
    setState(() => _checking = true);
    await _runPing();
    if (mounted) setState(() => _checking = false);
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_offline)
          Positioned.fill(
            child: Material(
              color: Colors.black.withOpacity(0.75),
              child: SafeArea(
                child: Center(
                  child: Container(
                    margin: const EdgeInsets.all(32),
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.wifi_off, size: 40, color: Color(0xFFC62828)),
                        const SizedBox(height: 14),
                        const Text("You're Offline", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF1B5E20))),
                        const SizedBox(height: 8),
                        const Text(
                          'Walang internet connection. I-check ang iyong Wi-Fi o mobile data — awtomatiko itong mawawala kapag bumalik na ang totoong koneksyon.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 12.5, color: Color(0xFF555555), height: 1.6),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: _checking ? null : _handleRetry,
                            icon: _checking
                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.refresh, size: 16),
                            label: Text(_checking ? 'Checking...' : 'Try Again'),
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 12)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}