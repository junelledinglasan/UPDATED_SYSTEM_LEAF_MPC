import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/member_provider.dart';
import '../../providers/language_provider.dart';
import '../../services/loans_service.dart';
import '../../services/payments_service.dart';
import '../../services/announcements_service.dart';
import '../../widgets/member_scaffold_helpers.dart';
import 'share_capital_history_screen.dart';
import '../admin/receipt_screen.dart';
import '../../utils/page_cache.dart';

class _MDColors {
  static const dark   = Color(0xFF1B5E20);
  static const green  = Color(0xFF2E7D32);
  static const sub    = Color(0xFF888888);
  static const red    = Color(0xFFC62828);
  static const orange = Color(0xFFE65100);
  static const blue   = Color(0xFF1565C0);
  static const border = Color(0xFFC8DDC8);
}

class MemberDashboard extends StatefulWidget {
  const MemberDashboard({super.key});

  @override
  State<MemberDashboard> createState() => _MemberDashboardState();
}

// Katumbas ng web's `toLocaleString()` — nagdadagdag ng comma thousand
// separators. Opsyonal na 2 decimal places (ginagamit lang sa "Next
// Payment Due" sa web, ang iba ay whole numbers).
String _peso(double value, {bool decimals = false}) {
  final fixed = value.toStringAsFixed(decimals ? 2 : 0);
  final parts = fixed.split('.');
  final wholePart = parts[0];
  final buffer = StringBuffer();
  final isNegative = wholePart.startsWith('-');
  final digits = isNegative ? wholePart.substring(1) : wholePart;
  for (int i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
    buffer.write(digits[i]);
  }
  final result = '${isNegative ? '-' : ''}${buffer.toString()}${parts.length > 1 ? '.${parts[1]}' : ''}';
  return '₱$result';
}

class _MemberDashboardState extends State<MemberDashboard> {
  bool _loading = true;
  List<dynamic> _loans = [];
  List<dynamic> _payments = [];
  List<dynamic> _notifs = [];
  // ── BAGO: scope key para sa cache — id ng member, naka-set kapag
  // available na ang profile (ginagamit din para i-clear kapag
  // magpalit ng account). ───────────────────────────────────────────
  String? _scopeKey;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
  }

  Future<void> _init() async {
    final memberProv = context.read<MemberProvider>();
    if (!memberProv.loading) {
      await _maybeLoadData(memberProv.isOfficial, memberProv);
    } else {
      await memberProv.load();
      if (mounted) await _maybeLoadData(context.read<MemberProvider>().isOfficial, context.read<MemberProvider>());
    }
  }

  Future<void> _maybeLoadData(bool isOfficial, MemberProvider memberProv) async {
    if (!isOfficial) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    _scopeKey = '${memberProv.profile?['id']}';

    // ── BAGO: cache-first — kung may naka-save nang datos mula sa
    // huling pagbisita dito (parehong app session), ipakita agad ito
    // habang tahimik na nagre-refresh sa likod, imbes na magpakita
    // ng loading spinner tuwing may bagong pag-navigate. ────────────
    final cached = PageCache.get<Map<String, dynamic>>('dashboard', _scopeKey);
    if (cached != null) {
      if (mounted) {
        setState(() {
          _loans = cached['loans'] as List<dynamic>? ?? [];
          _payments = cached['payments'] as List<dynamic>? ?? [];
          _notifs = cached['notifs'] as List<dynamic>? ?? [];
          _loading = false;
        });
      }
    } else {
      if (mounted) setState(() => _loading = true);
    }

    try {
      final results = await Future.wait([
        () async { try { return await LoansService.getLoans(); } catch (_) { return <dynamic>[]; } }(),
        () async { try { return await PaymentsService.getPayments(); } catch (_) { return <dynamic>[]; } }(),
        () async { try { return await AnnouncementsService.getAnnouncements(); } catch (_) { return <dynamic>[]; } }(),
      ]);
      final newLoans = results[0] as List<dynamic>;
      final newPayments = results[1] as List<dynamic>;
      final newNotifs = (results[2] as List<dynamic>).take(3).toList();
      if (mounted) {
        setState(() {
          _loans = newLoans;
          _payments = newPayments;
          _notifs = newNotifs;
        });
      }
      PageCache.set('dashboard', _scopeKey, {'loans': newLoans, 'payments': newPayments, 'notifs': newNotifs});
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final memberProv = context.watch<MemberProvider>();

    if (memberProv.loading) {
      return const MemberScreenScaffold(
        activeRouteKey: 'dashboard',
        body: Center(child: CircularProgressIndicator(color: _MDColors.green)),
      );
    }

    if (!memberProv.isOfficial) {
      return MemberScreenScaffold(activeRouteKey: 'dashboard', body: _NonOfficialWelcome(memberProv: memberProv));
    }

    return MemberScreenScaffold(
      activeRouteKey: 'dashboard',
      body: RefreshIndicator(
        onRefresh: () => _maybeLoadData(true, context.read<MemberProvider>()),
        color: _MDColors.green,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: _MDColors.green))
            : _buildOfficialDashboard(memberProv),
      ),
    );
  }

  Widget _buildOfficialDashboard(MemberProvider memberProv) {
    // ── BAGO: dynamic/API-based na translation — "t" shortcut function
    // mula sa LanguageProvider, gagamitin sa lahat ng English text sa
    // ibaba. Ang mismong English text ang ginagamit bilang key, kaya
    // hindi na kailangang idagdag muna sa translations.dart — kung
    // wala pang manual na Filipino entry doon, awtomatikong tatawag sa
    // MyMemory API at ise-cache. ─────────────────────────────────────
    final languageProv = context.watch<LanguageProvider>();
    String t(String key, [Map<String, dynamic>? vars]) => languageProv.t(key, vars);

    final activeLoan = _loans.firstWhere((l) => l['status'] == 'Active', orElse: () => _loans.isNotEmpty ? _loans.first : null);
    final totalLoan = double.tryParse('${activeLoan?['amount'] ?? 0}') ?? 0;
    final balance = double.tryParse('${activeLoan?['balance'] ?? 0}') ?? 0;
    final totalPaid = totalLoan - balance;
    final monthlyDue = double.tryParse('${activeLoan?['monthly_due'] ?? 0}') ?? 0;
    final paidPct = totalLoan > 0 ? ((totalPaid / totalLoan) * 100).round() : 0;
    final shareCapital = double.tryParse('${memberProv.profile?['share_capital'] ?? 0}') ?? 0;
    final firstname = memberProv.name.split(' ').first;
    final loanTypeDisplay = activeLoan?['loan_type'] != null ? t('${activeLoan!['loan_type']}') : t('No active loan');

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Banner ──────────────────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF1B5E20), Color(0xFF2E7D32), Color(0xFF388E3C)], stops: [0.0, 0.6, 1.0], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t('Good day, {name}!', {'name': firstname}), style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text(t("Here's a summary of your LEAF MPC account."), style: const TextStyle(color: Colors.white70, fontSize: 12)),
                const SizedBox(height: 14),
                Row(children: [
                  CircleAvatar(radius: 18, backgroundColor: Colors.white.withOpacity(0.2), child: Text(memberProv.initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800))),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(memberProv.name, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
                        Text(memberProv.memberId, style: const TextStyle(color: Colors.white70, fontSize: 10)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                    child: Text(t('Active'), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                  ),
                ]),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── KPI grid ────────────────────────────────────────────────
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.5,
            children: [
              _KpiCard(icon: Icons.account_balance_wallet_outlined, color: _MDColors.red, bg: const Color(0xFFFCE4EC), borderColor: const Color(0xFFFFCDD2), label: t('Remaining Balance'), value: _peso(balance), sub: '$loanTypeDisplay · ${activeLoan?['loan_id'] ?? "—"}', onTap: () => Navigator.pushNamed(context, '/member/my-loans')),
              _KpiCard(icon: Icons.calendar_today_outlined, color: _MDColors.orange, bg: const Color(0xFFF5F5F5), label: t('Next Payment Due'), value: _peso(monthlyDue, decimals: true), sub: '${activeLoan?['next_due_date'] ?? "—"}', onTap: () => Navigator.pushNamed(context, '/member/my-loans')),
              _KpiCard(icon: Icons.check_circle_outline, color: _MDColors.green, bg: const Color(0xFFF5F5F5), label: t('Total Paid'), value: _peso(totalPaid), sub: t('{pct}% of loan completed', {'pct': paidPct}), onTap: () => Navigator.pushNamed(context, '/member/my-loans')),
              _KpiCard(
                icon: Icons.trending_up, color: _MDColors.blue, bg: const Color(0xFFF5F5F5), label: t('Share Capital'), value: _peso(shareCapital), sub: t('Max loanable: {amount}', {'amount': _peso(shareCapital)}),
                onTap: () {
                  final memberId = memberProv.profile?['id'];
                  if (memberId != null) {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => ShareCapitalHistoryScreen(memberId: memberId, currentShareCapital: shareCapital)));
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 14),

          // ── Repayment progress ─────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _MDColors.border), borderRadius: BorderRadius.circular(12)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t('Loan Repayment Progress'), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _MDColors.dark)),
                Text('$loanTypeDisplay — ${activeLoan?['loan_id'] ?? "—"}', style: const TextStyle(fontSize: 10, color: _MDColors.sub)),
                const SizedBox(height: 10),
                ClipRRect(borderRadius: BorderRadius.circular(6), child: LinearProgressIndicator(value: (paidPct / 100).clamp(0, 1), backgroundColor: const Color(0xFFF0F0F0), color: _MDColors.green, minHeight: 10)),
                const SizedBox(height: 6),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text(t('{amount} paid', {'amount': _peso(totalPaid)}), style: const TextStyle(fontSize: 10.5, color: _MDColors.green, fontWeight: FontWeight.w700)),
                  Text('$paidPct%', style: const TextStyle(fontSize: 10.5, color: _MDColors.sub)),
                  Text(t('{amount} left', {'amount': _peso(balance)}), style: const TextStyle(fontSize: 10.5, color: _MDColors.red)),
                ]),
                const SizedBox(height: 12),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(child: _LoanDetailItem(t('Principal'), _peso(totalLoan))),
                  Expanded(child: _LoanDetailItem(t('Monthly Due'), _peso(monthlyDue, decimals: true), color: _MDColors.green)),
                ]),
                const SizedBox(height: 10),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(child: _LoanDetailItem(t('Status'), activeLoan?['status'] != null ? t('${activeLoan!['status']}') : '—')),
                  Expanded(child: _LoanDetailItem(t('Next Due'), '${activeLoan?['next_due_date'] ?? "—"}')),
                ]),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── Loan breakdown doughnut ────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _MDColors.border), borderRadius: BorderRadius.circular(12)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t('Loan Breakdown'), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _MDColors.dark)),
                Text(t('Paid vs Remaining'), style: const TextStyle(fontSize: 10, color: _MDColors.sub)),
                const SizedBox(height: 10),
                if (totalLoan == 0)
                  Padding(padding: const EdgeInsets.symmetric(vertical: 24), child: Center(child: Text(t('No active loan.'), style: const TextStyle(color: _MDColors.sub))))
                else
                  SizedBox(
                    height: 180,
                    child: Row(children: [
                      Expanded(
                        flex: 3,
                        child: PieChart(PieChartData(sectionsSpace: 2, centerSpaceRadius: 40, sections: [
                          PieChartSectionData(value: totalPaid, color: _MDColors.green, title: '', radius: 30),
                          PieChartSectionData(value: balance, color: const Color(0xFFE8F5E9), title: '', radius: 30),
                        ])),
                      ),
                      Expanded(
                        flex: 2,
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                          _LegendRow(color: _MDColors.green, label: t('Paid')),
                          const SizedBox(height: 6),
                          _LegendRow(color: const Color(0xFFC8E6C9), label: t('Remaining')),
                        ]),
                      ),
                    ]),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── Payment history line chart ─────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _MDColors.border), borderRadius: BorderRadius.circular(12)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t('Payment History'), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _MDColors.dark)),
                Text(t('Last 6 months'), style: const TextStyle(fontSize: 10, color: _MDColors.sub)),
                const SizedBox(height: 10),
                if (_payments.isEmpty)
                  Padding(padding: const EdgeInsets.symmetric(vertical: 24), child: Center(child: Text(t('No payment history yet.'), style: const TextStyle(color: _MDColors.sub))))
                else
                  SizedBox(height: 160, child: _buildPaymentLineChart()),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── Recent transactions ────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _MDColors.border), borderRadius: BorderRadius.circular(12)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Expanded(child: Text(t('Recent Transactions'), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _MDColors.dark))),
                  TextButton(onPressed: () => Navigator.pushNamed(context, '/member/my-loans'), child: Text(t('View All →'), style: const TextStyle(fontSize: 10.5, color: _MDColors.green))),
                ]),
                const SizedBox(height: 6),
                if (_payments.isEmpty)
                  Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Center(child: Text(t('No transactions yet.'), style: const TextStyle(color: _MDColors.sub, fontSize: 12))))
                else
                  ..._payments.take(5).map((tx) => InkWell(
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => ReceiptScreen(tx: tx))),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(children: [
                            Container(width: 32, height: 32, decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.credit_card, size: 15, color: _MDColors.green)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(t('Loan Payment'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  Text('${tx['paid_at'] ?? ''}', style: const TextStyle(fontSize: 10, color: _MDColors.sub)),
                                ],
                              ),
                            ),
                            Text('−${_peso(double.tryParse('${tx['amount'] ?? 0}') ?? 0)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _MDColors.red)),
                          ]),
                        ),
                      )),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── Announcements ───────────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _MDColors.border), borderRadius: BorderRadius.circular(12)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Expanded(child: Text(t('Announcements'), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _MDColors.dark))),
                  TextButton(onPressed: () => Navigator.pushNamed(context, '/member/announcements'), child: Text(t('View All →'), style: const TextStyle(fontSize: 10.5, color: _MDColors.green))),
                ]),
                const SizedBox(height: 6),
                if (_notifs.isEmpty)
                  Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Center(child: Text(t('No announcements yet.'), style: const TextStyle(color: _MDColors.sub, fontSize: 12))))
                else
                  ..._notifs.map((n) => InkWell(
                        onTap: () => Navigator.pushNamed(context, '/member/announcements'),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Container(width: 32, height: 32, decoration: BoxDecoration(color: const Color(0xFFE3F2FD), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.campaign_outlined, size: 15, color: _MDColors.blue)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${n['title'] ?? ''}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  Text('${n['created_at'] ?? ''}'.split('T').first, style: const TextStyle(fontSize: 10, color: _MDColors.sub)),
                                ],
                              ),
                            ),
                          ]),
                        ),
                      )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentLineChart() {
    final recent = _payments.take(6).toList().reversed.toList();
    final values = recent.map((p) => double.tryParse('${p['amount'] ?? 0}') ?? 0).toList();
    final maxY = values.isEmpty ? 100.0 : (values.reduce((a, b) => a > b ? a : b)) * 1.3;

    return LineChart(LineChartData(
      minY: 0,
      maxY: maxY == 0 ? 100 : maxY,
      gridData: FlGridData(show: true, drawVerticalLine: false, getDrawingHorizontalLine: (_) => const FlLine(color: Color(0xFFF0F4F1), strokeWidth: 1)),
      borderData: FlBorderData(show: false),
      titlesData: FlTitlesData(
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 34, getTitlesWidget: (v, m) => Text('₱${(v / 1000).toStringAsFixed(0)}k', style: const TextStyle(fontSize: 8, color: _MDColors.sub)))),
        bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 18, interval: 1, getTitlesWidget: (v, m) {
          final i = v.toInt();
          if (i < 0 || i >= recent.length) return const SizedBox.shrink();
          final date = '${recent[i]['paid_at'] ?? ''}';
          return Text(date.length >= 7 ? date.substring(0, 7) : date, style: const TextStyle(fontSize: 7, color: _MDColors.sub));
        })),
      ),
      lineBarsData: [
        LineChartBarData(spots: List.generate(values.length, (i) => FlSpot(i.toDouble(), values[i])), isCurved: true, color: _MDColors.green, barWidth: 2, dotData: const FlDotData(show: true), belowBarData: BarAreaData(show: true, color: const Color(0x142E7D32))),
      ],
    ));
  }
}

// ─── Non-Official Welcome ──────────────────────────────────────────────────
class _NonOfficialWelcome extends StatelessWidget {
  final MemberProvider memberProv;
  const _NonOfficialWelcome({required this.memberProv});

  @override
  Widget build(BuildContext context) {
    final languageProv = context.watch<LanguageProvider>();
    String t(String key, [Map<String, dynamic>? vars]) => languageProv.t(key, vars);
    final firstname = memberProv.name.split(' ').first;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF1B5E20), Color(0xFF2E7D32), Color(0xFF388E3C)], stops: [0.0, 0.6, 1.0], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t('Welcome, {name}! 👋', {'name': firstname}), style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text(t("You're almost there. Complete your membership to unlock all features."), style: const TextStyle(color: Colors.white70, fontSize: 12)),
                const SizedBox(height: 14),
                Row(children: [
                  CircleAvatar(radius: 18, backgroundColor: Colors.white.withOpacity(0.2), child: Text(memberProv.initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800))),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(memberProv.name, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
                        Text(t('Pending Membership'), style: const TextStyle(color: Colors.white70, fontSize: 10)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                    child: Text(t('Pending'), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                  ),
                ]),
              ],
            ),
          ),
          const SizedBox(height: 16),

          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, border: Border.all(color: _MDColors.border), borderRadius: BorderRadius.circular(14)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Text('⏳', style: TextStyle(fontSize: 24)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(t('Account Not Yet Official'), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: _MDColors.dark)),
                        const SizedBox(height: 3),
                        Text(t('Your account is created but you are not yet an official LEAF MPC member. Some features are currently locked.'), style: const TextStyle(fontSize: 11.5, color: Color(0xFF555555), height: 1.5)),
                      ],
                    ),
                  ),
                ]),
                const SizedBox(height: 16),

                Row(children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: const Color(0xFFFFF5F5), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFFFCDD2))),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t('🔒 Locked Features'), style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: _MDColors.red)),
                          const SizedBox(height: 6),
                          Text(t('Dashboard overview'), style: const TextStyle(fontSize: 10.5, color: Color(0xFF888888))),
                          const SizedBox(height: 3),
                          Text(t('My Loans & payments'), style: const TextStyle(fontSize: 10.5, color: Color(0xFF888888))),
                          const SizedBox(height: 3),
                          Text(t('Apply for Loan'), style: const TextStyle(fontSize: 10.5, color: Color(0xFF888888))),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: const Color(0xFFF1F8E9), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFC8E6C9))),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t('✅ Available Now'), style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: _MDColors.green)),
                          const SizedBox(height: 6),
                          Text(t('Notifications'), style: const TextStyle(fontSize: 10.5, color: Color(0xFF555555))),
                          const SizedBox(height: 3),
                          Text(t('Announcements'), style: const TextStyle(fontSize: 10.5, color: Color(0xFF555555))),
                          const SizedBox(height: 3),
                          Text(t('My Profile'), style: const TextStyle(fontSize: 10.5, color: Color(0xFF555555))),
                        ],
                      ),
                    ),
                  ),
                ]),
                const SizedBox(height: 12),

                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(color: const Color(0xFFF9FBE7), borderRadius: BorderRadius.circular(8), border: const Border(left: BorderSide(color: Color(0xFFC5E1A5), width: 3))),
                  child: Text(t('💡 Please complete your profile information first before applying for official membership.'), style: const TextStyle(fontSize: 10.5, color: Color(0xFF555555))),
                ),
                const SizedBox(height: 16),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: _MDColors.green, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 12)),
                    onPressed: () {
                      Navigator.pushNamed(context, '/member/apply-membership');
                    },
                    child: Text(t('Apply for Official Membership'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color bg;
  final String label;
  final String value;
  final String sub;
  final Color? borderColor;
  final VoidCallback? onTap;
  const _KpiCard({required this.icon, required this.color, required this.bg, required this.label, required this.value, required this.sub, this.borderColor, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(border: Border.all(color: borderColor ?? _MDColors.border), borderRadius: BorderRadius.circular(12)),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(width: 32, height: 32, alignment: Alignment.center, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)), child: Icon(icon, color: color, size: 17)),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontSize: 8.5, color: _MDColors.sub, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color))),
                  const SizedBox(height: 1),
                  Text(sub, style: const TextStyle(fontSize: 7.5, color: Color(0xFFAAAAAA)), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

class _LoanDetailItem extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  const _LoanDetailItem(this.label, this.value, {this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: _MDColors.sub)),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color ?? const Color(0xFF333333))),
      ],
    );
  }
}

class _LegendRow extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendRow({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      const SizedBox(width: 6),
      Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF555555))),
    ]);
  }
}