import 'package:flutter/material.dart';
import '../../services/members_service.dart';
import '../../services/loans_service.dart';
import 'loan_payment_screen.dart';

class _NLColors {
  static const title = Color(0xFF1B5E20);
  static const sub   = Color(0xFF888888);
  static const green = Color(0xFF2E7D32);
  static const red   = Color(0xFFC62828);
  static const orange = Color(0xFFF57F17);
}

// ── BAGO: 4 na bagong loan types (Regular, Petty Cash, Appliance,
// ATM) — pinalitan ang dating 5, tugma na sa binago nating LOAN_TYPES
// sa member-side loan_application_screen.dart. ──────────────────────
const List<String> kLoanTypesList = ['Regular Loan', 'Petty Cash Loan', 'Appliance Loan', 'ATM Loan'];

class NewLoanApplicationScreen extends StatefulWidget {
  const NewLoanApplicationScreen({super.key});

  @override
  State<NewLoanApplicationScreen> createState() => _NewLoanApplicationScreenState();
}

class _NewLoanApplicationScreenState extends State<NewLoanApplicationScreen> {
  int _step = 1;
  List<dynamic> _members = [];
  bool _fetching = true;
  String _search = '';
  dynamic _selMember;

  String _loanType = 'Regular Loan';
  final _amountCtrl = TextEditingController();
  // ── BAGO: para sa live-capping logic — huling valid na naka-type
  // na halaga, ibinabalik dito kapag tinangka nilang mag-type nang
  // lampas sa max loanable. ────────────────────────────────────────
  String _lastValidAmount = '';
  int _term = 12;
  final _purposeCtrl = TextEditingController();
  final _collateralCtrl = TextEditingController();
  String? _amountError;
  String? _purposeError;
  // ── BAGO: para sa "scroll-to-error" — kapag may hindi na-fill na
  // required field, awtomatikong mag-s-scroll at mag-fo-focus dito
  // imbes na basta magpakita ng error text na baka hindi mapansin. ────
  final _amountFieldKey = GlobalKey();
  final _purposeFieldKey = GlobalKey();
  final _amountFocus = FocusNode();
  final _purposeFocus = FocusNode();
  bool _loading = false;
  bool _done = false;
  Map<String, dynamic>? _result;
  double _monthlyResult = 0;

  bool _showRateEdit = false;
  double _serviceFeePct = 3;
  double _insurancePct = 1.25;
  double _sdPct = 1;
  double _scPct = 3;
  double _filingFeeAmt = 50;
  double _interestOverride = 0;

  @override
  void initState() {
    super.initState();
    _loadMembers();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _purposeCtrl.dispose();
    _collateralCtrl.dispose();
    _amountFocus.dispose();
    _purposeFocus.dispose();
    super.dispose();
  }

  Future<void> _loadMembers() async {
    try {
      final data = await MembersService.getMembers();
      if (mounted) setState(() => _members = data);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _fetching = false);
    }
  }

  List<dynamic> get _filtered => _members.where((m) {
        final q = _search.toLowerCase();
        return '${m['fullname'] ?? ''}'.toLowerCase().contains(q) || '${m['member_id'] ?? ''}'.toLowerCase().contains(q);
      }).toList();

  double get _shareCapital => double.tryParse('${_selMember?['share_capital'] ?? 0}') ?? 0;
  // ── FIX: wala pang dedikadong "max loanable" na ginagamit dito —
  // gamit na ngayon ang totoong "max_loanable" field mula sa member
  // data (na kumukuha na sa admin-editable na Loan Multiplier), hindi
  // basta share capital lang. ─────────────────────────────────────────
  double get _maxLoanable => double.tryParse('${_selMember?['max_loanable'] ?? _shareCapital}') ?? _shareCapital;
  double get _amount => double.tryParse(_amountCtrl.text) ?? 0;

  // ── FIX: dating iisang tiered formula (Regular Loan-style) lang ang
  // ginagamit dito, kahit anong loan type ang napili — mali ito, dahil
  // FIXED (hindi tiered) ang rate ng Appliance Loan (1.25%) at ATM Loan
  // (2%), at 0% naman ang Petty Cash Loan. Kaparehong ayos ng backend's
  // "get_loan_fee_structure()" at member-side's "_feeStructure()". ────
  double get _defaultRate {
    switch (_loanType) {
      case 'Appliance Loan':
        return 0.0125;
      case 'ATM Loan':
        return 0.02;
      case 'Petty Cash Loan':
        return 0;
      default: // Regular Loan
        return _amount <= 50000 ? 0.0125 : _amount <= 150000 ? 0.01125 : 0.01;
    }
  }

  double get _effectiveRate => _interestOverride > 0 ? _interestOverride / 100 : _defaultRate;

  // ── BAGO: Petty Cash Loan ₱2,000 MAXIMUM cap (hindi minimum, hindi
  // fixed) — kung mas mababa pa rito ang max loanable ng member (share
  // capital × multiplier), iyon na ang mas mahigpit na limitasyon.
  // Kaparehong logic ng member-side's "_effectiveMax" getter. ─────────
  double get _effectiveMax {
    if (_loanType == 'Petty Cash Loan') {
      return _maxLoanable > 0 ? (_maxLoanable < 2000 ? _maxLoanable : 2000.0) : 2000.0;
    }
    return _maxLoanable;
  }

  // ── BAGO: pareho ring gagamitin ng computation preview ang tamang
  // showComp condition — Petty Cash Loan ay walang ₱3,000 minimum
  // (amount > 0 na lang ang kailangan) — kaya dati, kahit anong halaga
  // ang i-type dito para sa Petty Cash Loan (max ₱2,000), HINDI kailanman
  // lumalabas ang computation preview (na naka-gate sa "_amount >= 3000"). ──
  bool get _showComp => _loanType == 'Petty Cash Loan' ? _amount > 0 : _amount >= 3000;

  // ── BAGO: i-reset ang mga admin-editable na rate papuntang tamang
  // DEFAULT ng napiling loan type — tinatawag ito kapag nagpalit ng
  // Loan Type, at ng "Reset to defaults" button. Dati, "Reset to
  // defaults" (at ang paunang state) ay laging Regular Loan's defaults
  // kahit anong loan type — kaya mali ang unang nakikita ng admin na
  // computation para sa Appliance/ATM/Petty Cash Loan hangga't hindi
  // niya ito mano-manong ini-edit. ─────────────────────────────────────
  void _applyDefaultRatesForType(String type, double amount) {
    switch (type) {
      case 'Appliance Loan':
        // Walang CBU, walang Savings Deposit para sa Appliance Loan.
        _serviceFeePct = 3; _insurancePct = 1.25; _sdPct = 0; _scPct = 0; _filingFeeAmt = 50; _interestOverride = 0;
        break;
      case 'ATM Loan':
        _serviceFeePct = 3; _insurancePct = 1.25; _sdPct = 1; _scPct = 3; _filingFeeAmt = 100; _interestOverride = 0;
        break;
      case 'Petty Cash Loan':
        // 3% Service Fee LANG — walang interest, walang Filing Fee,
        // walang Insurance, walang CBU, walang Savings Deposit.
        _serviceFeePct = 3; _insurancePct = 0; _sdPct = 0; _scPct = 0; _filingFeeAmt = 0; _interestOverride = 0;
        break;
      default: // Regular Loan
        _serviceFeePct = 3; _insurancePct = 1.25; _sdPct = 1; _scPct = 3; _filingFeeAmt = amount <= 50000 ? 50 : 100; _interestOverride = 0;
    }
  }
  double get _interest => _effectiveRate * _amount * _term;
  double get _serviceFee => _amount * (_serviceFeePct / 100);
  double get _filingFee => _filingFeeAmt;
  double get _insurance => _amount * (_insurancePct / 100);
  double get _sd => _amount * (_sdPct / 100);
  double get _sc => _amount * (_scPct / 100);
  double get _totalDed => _interest + _serviceFee + _filingFee + _insurance + _sd + _sc;
  double get _netProceeds => _amount - _totalDed;
  // ── FIX: dating "(_amount + _interest) / _term" — dito ang aktwal
  // na bug, hindi lang sa display. Kaparehong ayos ng backend at web. ──
  double get _monthly => _amount > 0 ? _amount / _term : 0;

  // ── BAGO: dating "jump" na options (3,6,9,12,18,24,36,48) —
  // ngayon sunod-sunod na 1-12 buwan, dahil dito na lang talaga
  // pipili ang admin.
  // ── FIX: Petty Cash Loan ay LOCKED sa 1 buwan lang ("payable within
  // 1 month only") — kaparehong ayos ng member-side at backend. ───────
  List<int> get _termOptions => _loanType == 'Petty Cash Loan' ? const [1] : List.generate(12, (i) => i + 1);

  // ── BAGO: mag-scroll at mag-focus sa field na may error. ─────────────
  void _scrollToField(GlobalKey key, FocusNode focus) {
    if (key.currentContext != null) {
      Scrollable.ensureVisible(key.currentContext!, duration: const Duration(milliseconds: 300), alignment: 0.2);
      Future.delayed(const Duration(milliseconds: 320), () => focus.requestFocus());
    }
  }

  Future<void> _handleSubmit() async {
    setState(() { _amountError = null; _purposeError = null; });
    if (_amount <= 0) { setState(() => _amountError = 'Enter a valid amount.'); _scrollToField(_amountFieldKey, _amountFocus); return; }
    // ── BAGO: tinanggal ang fixed na ₱3,000 minimum — desisyon na
    // lang ng admin/member kung magkano, basta hindi lalagpas sa max
    // loanable (na ino-enforce na rin habang nagta-type, hindi lang
    // sa submit).
    // ── FIX: gamit na ngayon ang "_effectiveMax" (hindi na basta
    // "_maxLoanable") — para talagang ma-enforce ang ₱2,000 cap ng
    // Petty Cash Loan sa submit, hindi lang sa keystroke-level capping. ──
    if (_amount > _effectiveMax) {
      setState(() => _amountError = _loanType == 'Petty Cash Loan'
          ? 'Petty Cash Loan has a maximum amount of ₱2,000.'
          : 'Amount exceeds max loanable of ₱${_effectiveMax.toStringAsFixed(0)}.');
      _scrollToField(_amountFieldKey, _amountFocus);
      return;
    }
    if (_purposeCtrl.text.trim().isEmpty) { setState(() => _purposeError = 'Purpose is required.'); _scrollToField(_purposeFieldKey, _purposeFocus); return; }

    setState(() => _loading = true);
    try {
      // ── FIX: dating walang "is_f2f: true" na ipinapadala — kaya sa
      // backend, "For Review" ang default na status, tapos manual pang
      // ino-override papuntang "Approved" (na para sa PENDING-RELEASE
      // queue, ginagamit ng ONLINE applications). Pero F2F ito — kasama
      // na ang member sa opisina, ibinibigay na agad ang pera doon
      // mismo — dapat DERETSO sa "Active" status, hindi dumaan pa sa
      // For Release. Sa pagpasa ng "is_f2f: true", awtomatiko nang
      // gagawing "Active" ng backend serializer, KASAMA na ang auto 1%
      // savings deposit (na dati rin nale-skip). ─────────────────────
      final result = await LoansService.createLoan({
        'member': _selMember['id'],
        'loan_type': _loanType,
        'amount': _amount,
        'term_months': _term,
        'purpose': _purposeCtrl.text,
        'collateral': _collateralCtrl.text,
        'is_f2f': true,
      });
      if (mounted) {
        setState(() {
          _result = result;
          _monthlyResult = double.tryParse('${result['monthly_due'] ?? _monthly}') ?? _monthly;
          _done = true;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _amountError = 'Failed to submit loan.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFD8E8CC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: _NLColors.title,
        elevation: 0.5,
        title: const Text('New F2F Loan Application', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: _NLColors.title)),
      ),
      body: _done ? _buildDone() : (_step == 1 ? _buildStep1() : _buildStep2()),
    );
  }

  Widget _buildDone() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const SizedBox(height: 10),
          const Icon(Icons.check_circle, size: 44, color: _NLColors.green),
          const SizedBox(height: 10),
          const Text('Application Recorded!', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: _NLColors.title)),
          const SizedBox(height: 8),
          Text('Loan application for ${_selMember['fullname']} has been recorded.', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12.5, color: _NLColors.sub)),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: const Color(0xFFF1F8E9), borderRadius: BorderRadius.circular(10)),
            child: Column(children: [
              _CredRow('Loan ID', '${_result?['loan_id'] ?? ''}'),
              _CredRow('Member', '${_selMember['member_id']}'),
              _CredRow('Loan Type', _loanType),
              _CredRow('Amount', '₱${_amount.toStringAsFixed(0)}'),
              _CredRow('Monthly', '₱${_monthlyResult.toStringAsFixed(0)}'),
            ]),
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(8)),
            // ── FIX: dating "Go to Loan Approval page to process this
            // application" — mali, dahil hindi na dumaan sa "For
            // Review"/"Approved" queue ang F2F loan (Active na agad
            // ito). Ang totoong susunod na hakbang ay "Loan Payment"
            // (kung saan naka-list ang mga Active loans). ────────────
            child: const Text('This loan is now Active and ready for collection.', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: _NLColors.green)),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: _NLColors.green, foregroundColor: Colors.white),
            // ── FIX: dating "Navigator.pop(context, true)" lang — hindi
            // ginagarantiyang mapupunta sa Loan Payment list (basta
            // babalik lang sa dating pinanggalingan). Ngayon, direktang
            // tinutungo ang Loan Payment screen — dito talaga makikita
            // agad ang bagong Active na loan. ─────────────────────────
            onPressed: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoanPaymentScreen())),
            child: const Text('Go to Loan Payment →'),
          ),
        ],
      ),
    );
  }

  Widget _buildStep1() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            const Align(alignment: Alignment.centerLeft, child: Text('Select the member who is applying for a loan.', style: TextStyle(fontSize: 11.5, color: _NLColors.sub))),
            const SizedBox(height: 10),
            TextField(
              onChanged: (v) => setState(() => _search = v),
              decoration: InputDecoration(hintText: 'Search by name or member ID...', prefixIcon: const Icon(Icons.search, size: 18), isDense: true, contentPadding: const EdgeInsets.symmetric(vertical: 12), border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
            ),
          ]),
        ),
        Expanded(
          child: _fetching
              ? const Center(child: CircularProgressIndicator())
              : _filtered.isEmpty
                  ? const Center(child: Text('No members found.', style: TextStyle(color: _NLColors.sub)))
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _filtered.length,
                      itemBuilder: (context, i) {
                        final m = _filtered[i];
                        final isSel = _selMember != null && _selMember['id'] == m['id'];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: Material(
                            color: isSel ? _NLColors.green.withOpacity(0.1) : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(10),
                              onTap: () => setState(() => _selMember = m),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: isSel ? _NLColors.green : const Color(0xFFE8EAE0), width: isSel ? 1.5 : 1),
                                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 4, offset: const Offset(0, 1))],
                                ),
                                child: Row(children: [
                                  CircleAvatar(radius: 20, backgroundColor: isSel ? _NLColors.green : _NLColors.green.withOpacity(0.15), child: Text('${m['fullname'] ?? 'M'}'.isNotEmpty ? '${m['fullname']}'[0].toUpperCase() : 'M', style: TextStyle(color: isSel ? Colors.white : _NLColors.green, fontWeight: FontWeight.w800))),
                                  const SizedBox(width: 12),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${m['fullname']}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)), Text('${m['member_id']}', style: TextStyle(fontSize: 10.5, color: _NLColors.green, fontWeight: FontWeight.w600))])),
                                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [Text('₱${(double.tryParse('${m['max_loanable'] ?? m['share_capital'] ?? 0}') ?? 0).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: _NLColors.green)), const Text('max loanable', style: TextStyle(fontSize: 8.5, color: Color(0xFFAAAAAA)))]),
                                ]),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel'))),
              const SizedBox(width: 10),
              Expanded(child: ElevatedButton(style: ElevatedButton.styleFrom(backgroundColor: _NLColors.green, foregroundColor: Colors.white), onPressed: _selMember != null ? () => setState(() => _step = 2) : null, child: const Text('Next →'))),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFFF7FAF7), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE4F0E5))),
                  child: Row(children: [
                    CircleAvatar(backgroundColor: _NLColors.green, child: Text('${_selMember['fullname'] ?? 'M'}'.isNotEmpty ? '${_selMember['fullname']}'[0].toUpperCase() : 'M', style: const TextStyle(color: Colors.white))),
                    const SizedBox(width: 10),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${_selMember['fullname']}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)), Text('${_selMember['member_id']} · Share Capital: ₱${_shareCapital.toStringAsFixed(0)} · Max: ₱${_maxLoanable.toStringAsFixed(0)}', style: const TextStyle(fontSize: 9.5, color: _NLColors.sub))])),
                  ]),
                ),
                const SizedBox(height: 14),

                const Text('Loan Type', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _NLColors.sub)),
                const SizedBox(height: 4),
                DropdownButtonFormField<String>(
                  value: _loanType,
                  items: kLoanTypesList.map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 12.5)))).toList(),
                  // ── FIX: dating hindi na-rereset ang mga rate (Service
                  // Fee/Insurance/SD/CBU/Filing Fee) kapag nagpalit ng
                  // loan type — kaya Regular Loan's defaults pa rin ang
                  // nananatili kahit Appliance/ATM/Petty Cash Loan na ang
                  // napili, hangga't hindi ito mano-manong ini-edit ng
                  // admin. Idinagdag din: clear ng amount/error tuwing
                  // magpapalit ng type (kaparehong UX ng member-side),
                  // dahil posibleng lampas na sa bagong _effectiveMax
                  // ang naka-type na halaga (hal. papuntang Petty Cash
                  // Loan mula sa isang malaking Regular Loan amount). ────
                  onChanged: (v) => setState(() {
                    _loanType = v!;
                    _applyDefaultRatesForType(_loanType, _amount);
                    _amountCtrl.clear();
                    _lastValidAmount = '';
                    _amountError = null;
                    _term = _termOptions.first;
                  }),
                  decoration: InputDecoration(isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10), border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
                ),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Amount (₱) *', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _NLColors.sub)),
                      const SizedBox(height: 4),
                      // ── FIX: dating plain na TextField lang, walang
                      // pumipigil sa pag-type nang lampas sa max
                      // loanable — puwede pang mag-type ng halagang
                      // mas malaki sa max, ma-catch lang sa submit.
                      // Ngayon, TINATANGGIHAN na ang keystroke MISMO
                      // kapag lalagpas na — kaparehong pattern ng web
                      // (AdminLayout.jsx). BAGO RIN: tinanggal ang
                      // ₱3,000 minimum sa hint text. ──────────────────
                      TextField(
                        key: _amountFieldKey,
                        focusNode: _amountFocus,
                        controller: _amountCtrl,
                        keyboardType: TextInputType.number,
                        onChanged: (val) {
                          final digitsOnly = val.replaceAll(RegExp(r'[^0-9]'), '');
                          if (digitsOnly.isEmpty) {
                            _lastValidAmount = '';
                            setState(() => _amountError = null);
                            return;
                          }
                          final parsed = int.tryParse(digitsOnly) ?? 0;
                          // ── FIX: gamit na ngayon ang "_effectiveMax"
                          // (hindi na basta "_maxLoanable") — para
                          // ma-cap talaga ang Petty Cash Loan sa ₱2,000
                          // kahit mas malaki pa ang member's overall max
                          // loanable. ──────────────────────────────────
                          if (_effectiveMax > 0 && parsed > _effectiveMax) {
                            // tanggihan, ibalik sa huling valid na value
                            _amountCtrl.value = TextEditingValue(
                              text: _lastValidAmount,
                              selection: TextSelection.collapsed(offset: _lastValidAmount.length),
                            );
                            return;
                          }
                          _lastValidAmount = digitsOnly;
                          if (digitsOnly != val) {
                            _amountCtrl.value = TextEditingValue(
                              text: digitsOnly,
                              selection: TextSelection.collapsed(offset: digitsOnly.length),
                            );
                          }
                          setState(() => _amountError = null);
                        },
                        decoration: InputDecoration(prefixText: '₱ ', hintText: _loanType == 'Petty Cash Loan' ? 'Max ₱2,000' : 'Enter amount', isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10), border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), errorText: _amountError),
                      ),
                      // ── FIX: "Max Loanable: ₱X" → kailangang gamit ang
                      // "_effectiveMax" (hindi basta "_maxLoanable") para
                      // makita ng admin ang TAMANG hangganan kapag Petty
                      // Cash Loan ang napili (₱2,000 cap, hindi ang buong
                      // max loanable ng member). ───────────────────────
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          _loanType == 'Petty Cash Loan'
                              ? 'Max: ₱2,000 (Petty Cash Loan cap) · Member\'s max loanable: ₱${_maxLoanable.toStringAsFixed(0)}'
                              : 'Max Loanable: ₱${_effectiveMax.toStringAsFixed(0)}',
                          style: const TextStyle(fontSize: 9.5, color: _NLColors.sub),
                        ),
                      ),
                    ]),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Term (months)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _NLColors.sub)),
                      const SizedBox(height: 4),
                      // ── FIX: naka-disable/locked na ang dropdown na 'to
                      // kapag Petty Cash Loan ang napili (1 buwan lang
                      // talaga ang term nito — "payable within 1 month
                      // only"). ───────────────────────────────────────
                      DropdownButtonFormField<int>(
                        value: _termOptions.contains(_term) ? _term : _termOptions.first,
                        items: _termOptions.map((t) => DropdownMenuItem(value: t, child: Text('$t month${t != 1 ? "s" : ""}', style: const TextStyle(fontSize: 12.5)))).toList(),
                        onChanged: _loanType == 'Petty Cash Loan' ? null : (v) => setState(() => _term = v!),
                        decoration: InputDecoration(isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10), border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
                      ),
                      if (_loanType == 'Petty Cash Loan')
                        const Padding(padding: EdgeInsets.only(top: 4), child: Text('Payable within 1 month only.', style: TextStyle(fontSize: 9.5, color: _NLColors.sub))),
                    ]),
                  ),
                ]),
                const SizedBox(height: 12),
                const Text('Purpose *', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _NLColors.sub)),
                const SizedBox(height: 4),
                TextField(key: _purposeFieldKey, focusNode: _purposeFocus, controller: _purposeCtrl, maxLines: 2, onChanged: (_) => setState(() => _purposeError = null), decoration: InputDecoration(hintText: 'Reason for the loan...', isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10), border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), errorText: _purposeError)),
                const SizedBox(height: 12),
                const Text('Collateral (optional)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _NLColors.sub)),
                const SizedBox(height: 4),
                TextField(controller: _collateralCtrl, decoration: InputDecoration(hintText: 'e.g. Land title, vehicle', isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10), border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)))),

                // ── FIX: dating "_amount >= 3000" — dahil ₱2,000 na
                // lang ang maximum ng Petty Cash Loan, hindi ito
                // KAILANMAN aabot sa ₱3,000, kaya HINDI KAILANMAN
                // lumalabas ang computation preview para dito. Gamit
                // na ngayon ang "_showComp" (amount > 0 na lang para sa
                // Petty Cash Loan). ─────────────────────────────────
                if (_showComp) ...[
                  const SizedBox(height: 16),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Loan Computation (LEAF MPC)', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: _NLColors.title)),
                    TextButton(
                      onPressed: () => setState(() => _showRateEdit = !_showRateEdit),
                      style: TextButton.styleFrom(backgroundColor: _showRateEdit ? const Color(0xFFFFF3E0) : const Color(0xFFF5F5F5), foregroundColor: _showRateEdit ? _NLColors.orange : const Color(0xFF888888), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)), padding: const EdgeInsets.symmetric(horizontal: 10)),
                      child: Text(_showRateEdit ? 'Done Editing' : 'Edit Rates', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600)),
                    ),
                  ]),
                  if (_showRateEdit) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: const Color(0xFFFFF8E1), border: Border.all(color: const Color(0xFFFFE082)), borderRadius: BorderRadius.circular(10)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Customize Rates', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _NLColors.orange)),
                          const SizedBox(height: 8),
                          Wrap(spacing: 8, runSpacing: 8, children: [
                            _RateField('Service Fee (%)', _serviceFeePct, (v) => setState(() => _serviceFeePct = v)),
                            _RateField('Insurance (%)', _insurancePct, (v) => setState(() => _insurancePct = v)),
                            _RateField('Savings Deposit (%)', _sdPct, (v) => setState(() => _sdPct = v)),
                            _RateField('Share Cap CBU (%)', _scPct, (v) => setState(() => _scPct = v)),
                            _RateField('Filing Fee (₱)', _filingFeeAmt, (v) => setState(() => _filingFeeAmt = v)),
                            _RateField('Interest Override (%/mo)', _interestOverride, (v) => setState(() => _interestOverride = v)),
                          ]),
                          const SizedBox(height: 4),
                          TextButton(
                            // ── FIX: dating naka-hardcode sa Regular
                            // Loan's defaults ang "reset" na 'to kahit
                            // anong loan type ang napili — gamit na
                            // ngayon ang "_applyDefaultRatesForType()"
                            // para tamang default per loan type ang
                            // ibinabalik. ───────────────────────────
                            onPressed: () => setState(() => _applyDefaultRatesForType(_loanType, _amount)),
                            child: const Text('↺ Reset to defaults', style: TextStyle(fontSize: 10, color: _NLColors.red)),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFFFF8F8), border: Border.all(color: const Color(0xFFFFCDD2)), borderRadius: BorderRadius.circular(10)),
                    child: Column(children: [
                      _PrevRow('Loan Amount', '₱${_amount.toStringAsFixed(0)}'),
                      _PrevRow('Monthly Amortization', '₱${_monthly.toStringAsFixed(2)}', color: _NLColors.green, bold: true),
                      const Divider(),
                      const Align(alignment: Alignment.centerLeft, child: Text('Upfront Deductions:', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF555555)))),
                      // ── FIX: dating may hiwalay na "Interest Rate"
                      // row sa itaas PLUS plain na "Interest" dito —
                      // nagmumukhang naka-doble ang kaltas kahit hindi
                      // naman. Tinanggal na ang linyang "Interest Rate",
                      // inilipat na lang ang rate info dito sa loob
                      // mismo ng "Interest" deduction row. ─────────────
                      // ── FIX: itinatago na ang mga deduction row kapag
                      // 0 ang rate (hal. Petty Cash Loan — walang
                      // interest/filing fee/insurance/SD/CBU) imbes na
                      // magpakita ng "₱0.00" clutter. Kaparehong ayos ng
                      // member-side's computation preview. ─────────────
                      if (_effectiveRate > 0)
                        _PrevRow('Interest (${(_effectiveRate * 100).toStringAsFixed(3)}%/mo × $_term mo${_interestOverride > 0 ? " (custom)" : ""})', '− ₱${_interest.toStringAsFixed(2)}', color: _NLColors.red),
                      if (_serviceFeePct > 0)
                        _PrevRow('Service Fee ($_serviceFeePct%)', '− ₱${_serviceFee.toStringAsFixed(2)}', color: _NLColors.red),
                      if (_filingFeeAmt > 0)
                        _PrevRow('Filing Fee (₱$_filingFeeAmt)', '− ₱${_filingFee.toStringAsFixed(2)}', color: _NLColors.red),
                      if (_insurancePct > 0)
                        _PrevRow('Insurance ($_insurancePct%)', '− ₱${_insurance.toStringAsFixed(2)}', color: _NLColors.red),
                      if (_sdPct > 0)
                        _PrevRow('Savings Deposit ($_sdPct%)', '− ₱${_sd.toStringAsFixed(2)}', color: _NLColors.red),
                      if (_scPct > 0)
                        _PrevRow('Share Capital CBU ($_scPct%)', '− ₱${_sc.toStringAsFixed(2)}', color: _NLColors.red),
                      const Divider(),
                      _PrevRow('Net Proceeds', '₱${_netProceeds.toStringAsFixed(2)}', bold: true),
                    ]),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(8)),
                    child: Text('Member will receive ₱${_netProceeds.toStringAsFixed(2)} after all deductions.', style: const TextStyle(fontSize: 10.5, color: _NLColors.green)),
                  ),
                ],
              ],
            ),
          ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              Expanded(child: OutlinedButton(onPressed: () => setState(() => _step = 1), child: const Text('← Back'))),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: _NLColors.green, foregroundColor: Colors.white),
                  onPressed: _loading ? null : _handleSubmit,
                  child: _loading ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Submit Application'),
                ),
              ),
            ]),
          ),
        ),
      ],
    );
  }
}

class _RateField extends StatefulWidget {
  final String label;
  final double value;
  final void Function(double) onChanged;
  const _RateField(this.label, this.value, this.onChanged);

  @override
  State<_RateField> createState() => _RateFieldState();
}

class _RateFieldState extends State<_RateField> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: '${widget.value}');
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: (MediaQuery.of(context).size.width - 60) / 2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.label, style: const TextStyle(fontSize: 9, color: Color(0xFF888888), fontWeight: FontWeight.w600)),
          const SizedBox(height: 3),
          TextField(
            controller: _ctrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            onChanged: (v) => widget.onChanged(double.tryParse(v) ?? 0),
            decoration: InputDecoration(isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8), filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFFFFE082)))),
          ),
        ],
      ),
    );
  }
}

class _PrevRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? color;
  const _PrevRow(this.label, this.value, {this.bold = false, this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Expanded(child: Text(label, style: TextStyle(fontSize: bold ? 12.5 : 11, fontWeight: bold ? FontWeight.w700 : FontWeight.w500, color: bold ? _NLColors.title : const Color(0xFF555555)))),
        Text(value, style: TextStyle(fontSize: bold ? 13 : 11.5, fontWeight: FontWeight.w700, color: color ?? const Color(0xFF333333))),
      ]),
    );
  }
}

class _CredRow extends StatelessWidget {
  final String label;
  final String value;
  const _CredRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: const TextStyle(fontSize: 11, color: _NLColors.sub)),
        Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _NLColors.title, fontFamily: 'monospace')),
      ]),
    );
  }
}