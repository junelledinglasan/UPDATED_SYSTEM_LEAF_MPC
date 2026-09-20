import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/members_service.dart';
import '../../widgets/ph_address_picker.dart';

// ── BAGO: required share capital para maging Official Member — ₱4,000.
// Ito ang MAX CAP ng "Amount Paid" dito — dating walang anumang clamp,
// kaya kahit anong halaga ay nakakapasa. ────────────────────────────
const double kRequiredShareCapital = 4000;
// ── BAGO: parehong age/classification auto-fill logic ng web's
// AdminLayout.jsx (RegisterModal) — dapat magkatugma ang dalawang forms. ──
const int kMinAge = 18; // minimum age para maka-register bilang member
const int kSeniorAge = 60; // RA 9994 (Expanded Senior Citizens Act)

class _RMColors {
  static const green  = Color(0xFF2E7D32);
  static const dark   = Color(0xFF1B5E20);
  static const sub    = Color(0xFF888888);
  static const border = Color(0xFFE0E0E0);
  static const label  = Color(0xFFAAAAAA);
  static const red    = Color(0xFFE53935);
}

class RegisterMemberScreen extends StatefulWidget {
  const RegisterMemberScreen({super.key});

  @override
  State<RegisterMemberScreen> createState() => _RegisterMemberScreenState();
}

class _RegisterMemberScreenState extends State<RegisterMemberScreen> {
  // 0=personal, 1=spouse, 2=classification, 3=account
  int _tabIndex = 0;
  bool _loading = false;
  Map<String, dynamic>? _result;
  final Map<String, String> _errors = {};

  final Map<String, dynamic> _form = {
    // Personal
    'first_name': '', 'last_name': '', 'middle_name': '',
    'birth_date': '', 'place_of_birth': '', 'sex': 'Male',
    'civil_status': 'Single', 'educational_attainment': '',
    'contact_number': '', 'email': '', 'address': '',
    'occupation': '', 'income': '', 'tin_no': '', 'sss_gsis_no': '',
    'religious_social_affiliation': '', 'share_capital': '',
    'sex_other': '',
    'birth_certificate': false, 'marriage_certificate': false,
    // Spouse & Family
    'spouse_name': '', 'spouse_occupation': '', 'spouse_income': '',
    'no_of_dependants': '', 'beneficiary_name': '', 'beneficiary_relationship': '',
    'credit_references': '',
    // Classification
    'classification': 'Employed', 'school_name': '', 'year_level': '', 'allowance': '',
    'pension_income': '', 'job_type': 'Employed', 'monthly_income': '',
  };
  final Map<String, TextEditingController> _c = {};

  TextEditingController _ctrl(String key) => _c.putIfAbsent(key, () => TextEditingController(text: '${_form[key]}'));

  @override
  void dispose() {
    for (final c in _c.values) {
      c.dispose();
    }
    super.dispose();
  }

  // ── BAGO: kinakalkula ang edad base sa napiling birth_date — kaparehong
  // formula ng computeAge() sa manage_member_screen.dart, hiwalay lang na
  // function dito para hindi na kailangang mag-import pa (iwas circular
  // dependency). ────────────────────────────────────────────────────────
  int? _computeAge(String? birthDate) {
    if (birthDate == null || birthDate.isEmpty) return null;
    try {
      final bd = DateTime.parse(birthDate);
      final today = DateTime.now();
      int age = today.year - bd.year;
      if (today.month < bd.month || (today.month == bd.month && today.day < bd.day)) age--;
      return age;
    } catch (_) {
      return null;
    }
  }

  // ── BAGO: awtomatikong pinipili ang Classification (Student/Senior/
  // Employed) base sa edad (Date of Birth) at sa laman ng Occupation/
  // Income — eksaktong kaparehong logic ng web's AdminLayout.jsx
  // (RegisterModal) para magkatugma ang dalawang forms. Tinatawag ito
  // tuwing magbabago ang birth_date, occupation, o income. ──────────────
  void _autoClassification() {
    final age = _computeAge('${_form['birth_date']}');
    final occupation = '${_form['occupation'] ?? ''}';
    final income = double.tryParse('${_form['income'] ?? ''}') ?? 0;
    String? autoClass;
    if (age != null && age >= kSeniorAge) {
      autoClass = 'Senior';
    } else if (RegExp(r'student|estudyante|iskolar', caseSensitive: false).hasMatch(occupation)) {
      autoClass = 'Student';
    } else if (occupation.trim().isNotEmpty || income > 0) {
      autoClass = 'Employed';
    }
    if (autoClass != null && autoClass != _form['classification']) {
      setState(() => _form['classification'] = autoClass);
    }
  }

  Map<String, String> _validate() {
    final e = <String, String>{};
    if ('${_form['first_name']}'.trim().isEmpty) e['first_name'] = 'Required';
    if ('${_form['last_name']}'.trim().isEmpty) e['last_name'] = 'Required';
    if ('${_form['birth_date']}'.trim().isEmpty) {
      e['birth_date'] = 'Required';
    } else {
      // ── BAGO: 18 years old minimum — dating walang anumang age check
      // dito, kaya kahit taong-kasalukuyan ang ilagay bilang birthdate
      // ay tumutuloy pa rin. ──────────────────────────────────────────
      final age = _computeAge('${_form['birth_date']}');
      if (age == null) {
        e['birth_date'] = 'Invalid date';
      } else if (age < kMinAge) {
        e['birth_date'] = 'Member must be at least $kMinAge years old.';
      }
    }
    if ('${_form['place_of_birth']}'.trim().isEmpty) e['place_of_birth'] = 'Required';
    if (_form['sex'] == 'Other' && '${_form['sex_other']}'.trim().isEmpty) e['sex_other'] = 'Please specify';
    if ('${_form['religious_social_affiliation']}'.trim().isEmpty) e['religious_social_affiliation'] = 'Required';
    if ('${_form['contact_number']}'.trim().isEmpty) e['contact_number'] = 'Required';
    if ('${_form['email']}'.trim().isEmpty) e['email'] = 'Required';
    if ('${_form['address']}'.trim().isEmpty) e['address'] = 'Please complete the address dropdowns above.';
    if ('${_form['occupation']}'.trim().isEmpty) e['occupation'] = 'Required';
    if ('${_form['income']}'.trim().isEmpty) e['income'] = 'Required';
    if ('${_form['share_capital']}'.trim().isEmpty) e['share_capital'] = 'Required';
    if (_form['classification'] == 'Student') {
      if ('${_form['school_name']}'.trim().isEmpty) e['school_name'] = 'Required';
      if ('${_form['year_level']}'.trim().isEmpty) e['year_level'] = 'Required';
    }
    return e;
  }

  void _syncControllers() {
    for (final entry in _c.entries) {
      _form[entry.key] = entry.value.text;
    }
  }

  Future<void> _handleSubmit() async {
    _syncControllers();
    final errs = _validate();
    if (errs.isNotEmpty) {
      setState(() => _errors
        ..clear()
        ..addAll(errs));
      final personalFields = ['first_name', 'last_name', 'birth_date', 'place_of_birth', 'sex_other', 'religious_social_affiliation', 'contact_number', 'email', 'address', 'occupation', 'income', 'share_capital'];
      final classFields = ['school_name', 'year_level'];
      if (personalFields.any(errs.containsKey)) {
        setState(() => _tabIndex = 0);
      } else if (classFields.any(errs.containsKey)) {
        setState(() => _tabIndex = 2);
      }
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await MembersService.registerMember({
        'first_name': _form['first_name'],
        'last_name': _form['last_name'],
        'middle_name': _form['middle_name'],
        'birth_date': _form['birth_date'],
        'place_of_birth': _form['place_of_birth'],
        'sex': _form['sex'] == 'Other' ? _form['sex_other'] : _form['sex'],
        'civil_status': _form['civil_status'],
        'educational_attainment': _form['educational_attainment'],
        'contact_number': _form['contact_number'],
        'email': _form['email'] ?? '',
        'address': _form['address'],
        'occupation': _form['occupation'],
        'income': _form['income'].toString().isEmpty ? 0 : _form['income'],
        'tin_no': _form['tin_no'],
        'sss_gsis_no': _form['sss_gsis_no'],
        'religious_social_affiliation': _form['religious_social_affiliation'],
        'birth_certificate': _form['birth_certificate'],
        'marriage_certificate': _form['marriage_certificate'],
        'spouse_name': _form['spouse_name'],
        'spouse_occupation': _form['spouse_occupation'],
        'spouse_income': _form['spouse_income'].toString().isEmpty ? 0 : _form['spouse_income'],
        'no_of_dependants': _form['no_of_dependants'].toString().isEmpty ? 0 : _form['no_of_dependants'],
        'beneficiary_name': _form['beneficiary_name'],
        'beneficiary_relationship': _form['beneficiary_relationship'],
        'credit_references': _form['credit_references'],
        'classification': _form['classification'],
        'share_capital': _form['share_capital'].toString().isEmpty ? 0 : _form['share_capital'],
        'school_name': _form['school_name'],
        'year_level': _form['year_level'],
        'allowance': _form['allowance'].toString().isEmpty ? 0 : _form['allowance'],
        'pension_income': _form['pension_income'].toString().isEmpty ? 0 : _form['pension_income'],
        'job_type': _form['job_type'],
        'monthly_income': _form['monthly_income'].toString().isEmpty ? 0 : _form['monthly_income'],
      });
      if (mounted) {
        setState(() {
          _result = res;
          _tabIndex = 3;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _errors['first_name'] = 'Failed to register member.';
          _tabIndex = 0;
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickDate() async {
    // ── BAGO: ang pinakabagong petsang puwedeng piliin sa calendar
    // mismo ay eksaktong 18 taon bago ngayon — dating "DateTime.now()"
    // ang lastDate, kaya kahit petsa ngayong taon ay puwedeng piliin
    // sa UI palang, bago pa man dumating sa _validate(). ────────────────
    final today = DateTime.now();
    final eighteenYearsAgo = DateTime(today.year - 18, today.month, today.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: eighteenYearsAgo,
      firstDate: DateTime(1930),
      lastDate: eighteenYearsAgo,
    );
    if (picked != null) {
      final formatted = '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      setState(() {
        _form['birth_date'] = formatted;
        _ctrl('birth_date').text = formatted;
        _errors.remove('birth_date');
      });
      _autoClassification();
    }
  }

  InputDecoration _dec({String? error}) => InputDecoration(
        isDense: true,
        filled: true,
        fillColor: const Color(0xFFFAFCF8),
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        errorText: error,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: _RMColors.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: error != null ? _RMColors.red : _RMColors.border)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: _RMColors.green, width: 1.5)),
      );

  Widget _textField(String key, String label, {bool required = false, bool optional = false, TextInputType? type, bool full = false, List<TextInputFormatter>? inputFormatters}) {
    return _FieldBox(
      label: label,
      required: required,
      optional: optional,
      full: full,
      child: TextField(
        controller: _ctrl(key),
        keyboardType: type,
        // ── BAGO: "number lang" na fields (CP No., TIN No., SSS/GSIS
        // No.) — dating walang filter, kaya kahit letra ay nakikita
        // pang ma-type. Kaparehong fix ng web (regex-based filtering). ──
        inputFormatters: inputFormatters,
        style: const TextStyle(fontSize: 12.5),
        onChanged: (v) {
          _errors.remove(key);
          // ── BAGO: "occupation" at "income" lang ang kailangang
          // i-sync agad sa _form (hindi lang sa Submit) dahil ito ang
          // dalawang field na sinusubaybayan ng _autoClassification(). ──
          if (key == 'occupation' || key == 'income') {
            _form[key] = v;
            _autoClassification();
          }
        },
        decoration: _dec(error: _errors[key]),
      ),
    );
  }

  Widget _selectField(String key, String label, List<String> options, {bool full = false, bool required = false}) {
    return _FieldBox(
      label: label,
      required: required,
      full: full,
      child: DropdownButtonFormField<String>(
        value: options.contains(_form[key]) ? _form[key] : options.first,
        items: options.map((o) => DropdownMenuItem(value: o, child: Text(o, style: const TextStyle(fontSize: 12.5)))).toList(),
        onChanged: (v) => setState(() => _form[key] = v),
        decoration: _dec(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const tabLabels = ['Personal Info', 'Spouse & Family', 'Classification', 'Account Info'];
    return Scaffold(
      backgroundColor: const Color(0xFFD8E8CC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: _RMColors.dark,
        elevation: 0.5,
        title: const Text('Register New Member', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _RMColors.dark)),
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFFF9FBE7),
            child: const Text('LEAF MPC Member Application & Information Sheet', style: TextStyle(fontSize: 11.5, color: _RMColors.sub)),
          ),
          // ── Tabs ──────────────────────────────────────────────────
          Container(
            color: Colors.white,
            child: Row(
              children: List.generate(tabLabels.length, (i) => _TabButton(label: tabLabels[i], index: i, active: _tabIndex == i, done: _result == null, onTap: () => setState(() => _tabIndex = i))),
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(14),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE0EAD8))),
                child: LayoutBuilder(
                  builder: (context, constraints) => _FieldWidth(
                    maxWidth: constraints.maxWidth,
                    child: _buildTabContent(),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: _result != null
              ? ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: _RMColors.green, foregroundColor: Colors.white),
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Done'),
                )
              : Row(
                  children: [
                    if (_tabIndex > 0)
                      Expanded(child: OutlinedButton(onPressed: () => setState(() => _tabIndex--), child: const Text('← Previous'))),
                    if (_tabIndex == 0) Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel'))),
                    const SizedBox(width: 10),
                    if (_tabIndex < 2)
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: _RMColors.green, foregroundColor: Colors.white),
                          onPressed: () => setState(() => _tabIndex++),
                          child: const Text('Next →'),
                        ),
                      )
                    else
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: _RMColors.green, foregroundColor: Colors.white),
                          onPressed: _loading ? null : _handleSubmit,
                          child: _loading
                              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.check, size: 15, color: Colors.white), SizedBox(width: 6), Text('Register Member')]),
                        ),
                      ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildTabContent() {
    // ── TAB 0: Personal Info ──────────────────────────────────────
    if (_tabIndex == 0) {
      return Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          const _SectionHeader(icon: Icons.badge_outlined, label: 'FULL NAME'),
          _textField('last_name', 'Surname', required: true),
          _textField('first_name', 'First Name', required: true),
          _textField('middle_name', 'Middle Name', optional: true),

          const _SectionHeader(icon: Icons.cake_outlined, label: 'BIRTH INFORMATION'),
          _FieldBox(
            label: 'Date of Birth',
            required: true,
            child: InkWell(
              onTap: _pickDate,
              child: InputDecorator(
                decoration: _dec(error: _errors['birth_date']),
                child: Text('${_form['birth_date']}'.isEmpty ? 'Select date' : '${_form['birth_date']}', style: const TextStyle(fontSize: 12.5)),
              ),
            ),
          ),
          _textField('place_of_birth', 'Place of Birth', required: true),

          const _SectionHeader(icon: Icons.person_outline, label: 'PERSONAL DETAILS'),
          _selectField('sex', 'Sex', const ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other']),
          if (_form['sex'] == 'Other')
            _textField('sex_other', 'Please specify', required: true),
          _selectField('civil_status', 'Civil Status', const ['Single', 'Married', 'Widowed', 'Separated']),
          _selectField('educational_attainment', 'Educational Attainment', const ['Elementary', 'High School', 'Vocational', 'College', 'Post Graduate']),
          _textField('religious_social_affiliation', 'Religious/Social Affiliation', required: true),
          _textField('tin_no', 'TIN No.', optional: true, inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d-]'))]),
          _textField('sss_gsis_no', 'SSS/GSIS No.', optional: true, inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d-]'))]),

          const _SectionHeader(icon: Icons.location_on_outlined, label: 'ADDRESS'),
          PhAddressPicker(
            errorRegion: _errors['address'],
            onAddressChanged: (addr) => setState(() {
              _form['address'] = addr;
              _errors.remove('address');
            }),
          ),

          const _SectionHeader(icon: Icons.call_outlined, label: 'CONTACT INFORMATION'),
          _textField('contact_number', 'Tel. No. / CP No.', required: true, type: TextInputType.phone, inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d+]'))]),
          _textField('email', 'Email Address', required: true, type: TextInputType.emailAddress),

          const _SectionHeader(icon: Icons.work_outline, label: 'EMPLOYMENT'),
          _textField('occupation', 'Occupation', required: true),
          _textField('income', 'Monthly Income (₱)', required: true, type: TextInputType.number),

          const _SectionHeader(icon: Icons.payments_outlined, label: 'MEMBERSHIP PAYMENT'),
          _FieldBox(
            label: 'Amount Paid for Membership (₱)',
            required: true,
            child: TextField(
              controller: _ctrl('share_capital'),
              keyboardType: TextInputType.number,
              // ── BAGO: naka-cap na sa max ₱4,000 (kRequiredShareCapital)
              // — tinatanggihan agad ang keystroke kapag lalampas, gaya
              // ng ginawa na sa web version (AdminLayout.jsx's
              // RegisterModal) — dating walang anumang limitasyon dito,
              // kaya kahit ₱34,554,334 (o anumang halaga) ay nakakapasa. ──
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, _MaxCapFormatter(kRequiredShareCapital)],
              onChanged: (v) => setState(() => _form['share_capital'] = v),
              style: const TextStyle(fontSize: 12.5),
              decoration: _dec().copyWith(hintText: 'e.g. 4000'),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text('Maximum: ₱${kRequiredShareCapital.toStringAsFixed(0)} — the full required share capital.', style: const TextStyle(fontSize: 10, color: Color(0xFFAAAAAA))),
          ),
          if ((double.tryParse('${_form['share_capital']}') ?? 0) > 0)
            Builder(builder: (context) {
              final paid = double.tryParse('${_form['share_capital']}') ?? 0;
              final fullyPaid = paid >= kRequiredShareCapital;
              return Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(color: fullyPaid ? const Color(0xFFE8F5E9) : const Color(0xFFFFF8E1), borderRadius: BorderRadius.circular(8)),
                child: Row(
                  children: [
                    Icon(Icons.lightbulb_outline, size: 13, color: fullyPaid ? _RMColors.green : const Color(0xFFE65100)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        // ── FIX: dating "(paid × 2)" ang display — hindi
                        // na doble ang Share Capital sa bagong member,
                        // 1:1 na lang (ang Loan Multiplier system mismo
                        // ang bahalang mag-scale ng Max Loanable sa
                        // paglipas ng panahon). ──────────────────────────
                        // ── BAGO: paalala kung ma-lo-lock na ito
                        // (fully paid) o puwede pa rin i-update ni admin
                        // sa susunod (partial). ─────────────────────────
                        'Share Capital = ₱${paid.toStringAsFixed(0)} · Max Loanable = ₱${paid.toStringAsFixed(0)} (×1, new member default)'
                        '${fullyPaid ? " — Fully paid, will be locked." : " — Partial payment; admin can still update this later."}',
                        style: TextStyle(fontSize: 10.5, color: fullyPaid ? _RMColors.green : const Color(0xFFE65100), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              );
            }),
          SizedBox(
            width: double.infinity,
            child: Material(
              color: Colors.transparent,
              child: CheckboxListTile(
                value: _form['birth_certificate'] == true,
                onChanged: (v) => setState(() => _form['birth_certificate'] = v ?? false),
                title: const Text('Birth Certificate Submitted', style: TextStyle(fontSize: 12)),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                dense: true,
                activeColor: _RMColors.green,
              ),
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: Material(
              color: Colors.transparent,
              child: CheckboxListTile(
                value: _form['marriage_certificate'] == true,
                onChanged: (v) => setState(() => _form['marriage_certificate'] = v ?? false),
                title: const Text('Marriage Certificate Submitted (if married)', style: TextStyle(fontSize: 12)),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                dense: true,
                activeColor: _RMColors.green,
              ),
            ),
          ),
        ],
      );
    }

    // ── TAB 1: Spouse & Family ─────────────────────────────────────
    if (_tabIndex == 1) {
      return Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(color: const Color(0xFFF9FEF9), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE8F5E9))),
            child: const Text('Fill in spouse information if married. Leave blank if not applicable.', style: TextStyle(fontSize: 11.5, color: Color(0xFF555555))),
          ),
          _textField('spouse_name', 'Spouse Name'),
          _textField('spouse_occupation', 'Spouse Occupation'),
          _textField('spouse_income', 'Spouse Monthly Income (₱)', type: TextInputType.number),
          _textField('no_of_dependants', 'No. of Dependants', type: TextInputType.number),
          const _SectionHeader(icon: Icons.family_restroom_outlined, label: 'BENEFICIARY INFORMATION'),
          _textField('beneficiary_name', 'Beneficiary Name'),
          _textField('beneficiary_relationship', 'Relationship to Member'),
          const _SectionHeader(icon: Icons.contact_page_outlined, label: 'CREDIT REFERENCES'),
          _FieldBox(
            label: 'Credit References',
            full: true,
            child: TextField(
              controller: _ctrl('credit_references'),
              maxLines: 3,
              style: const TextStyle(fontSize: 12.5),
              decoration: _dec().copyWith(hintText: 'Names and contact details of credit references...'),
            ),
          ),
        ],
      );
    }

    // ── TAB 2: Classification ───────────────────────────────────────
    if (_tabIndex == 2) {
      final classification = _form['classification'];
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── FIX: dating "Member Classification" lang, walang asterisk
          // — ginawa nang UPPERCASE + red asterisk (*), kaparehong-
          // kapareho ng web's "MEMBER CLASSIFICATION *" label. ─────────
          Text.rich(
            TextSpan(
              text: 'MEMBER CLASSIFICATION',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _RMColors.sub, letterSpacing: 0.4),
              children: const [TextSpan(text: ' *', style: TextStyle(color: _RMColors.red))],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _ClassCard(label: 'Student', icon: Icons.school_outlined, active: classification == 'Student', onTap: () => setState(() => _form['classification'] = 'Student'))),
              const SizedBox(width: 8),
              Expanded(child: _ClassCard(label: 'Senior', icon: Icons.elderly_outlined, active: classification == 'Senior', onTap: () => setState(() => _form['classification'] = 'Senior'))),
              const SizedBox(width: 8),
              Expanded(child: _ClassCard(label: 'Employed', icon: Icons.work_outline, active: classification == 'Employed', onTap: () => setState(() => _form['classification'] = 'Employed'))),
            ],
          ),
          // ── BAGO: helper caption — kaparehong-kapareho ng text sa web,
          // para malinaw sa admin na auto ang pagpili nito base sa Date
          // of Birth/Occupation, pero puwede pa rin i-override nang
          // manual. ─────────────────────────────────────────────────────
          const Padding(
            padding: EdgeInsets.only(top: 6),
            child: Text(
              'Awtomatikong napipili ito batay sa Date of Birth at Occupation na inilagay sa Personal Info tab. Puwede pa ring i-click nang mano-mano kung kailangan mong baguhin.',
              style: TextStyle(fontSize: 10.5, color: _RMColors.sub, height: 1.4),
            ),
          ),
          const SizedBox(height: 14),
          LayoutBuilder(builder: (context, constraints) {
            return _FieldWidth(
              maxWidth: constraints.maxWidth,
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  if (classification == 'Student') ...[
                    _textField('school_name', 'School Name', required: true),
                    _selectField('year_level', 'Year Level', const ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate']),
                    _textField('allowance', 'Monthly Allowance (₱)', type: TextInputType.number),
                  ],
                  if (classification == 'Senior') ...[
                    _selectField('educational_attainment', 'Educational Attainment', const ['Elementary', 'High School', 'Vocational', 'College', 'Post Graduate']),
                    _textField('pension_income', 'Monthly Pension Income (₱)', type: TextInputType.number),
                  ],
                  // ── FIX: dating hiwalay na manual input ito (duplicate
                  // ng "Occupation" sa Personal Info/Employment section,
                  // at hiwalay na "monthly_income" state kaysa sa "income"
                  // — kaya doble ang pinapasok ng admin). Ngayon, AUTO
                  // FILL-UP na lang mula sa Personal Info/Employment
                  // section — read-only display, eksaktong kaparehong
                  // ayos ng web's AdminLayout.jsx (RegisterModal). ────────
                  if (classification == 'Employed') ...[
                    SizedBox(
                      width: double.infinity,
                      child: Builder(builder: (context) {
                        final occupation = '${_form['occupation'] ?? ''}';
                        final income = double.tryParse('${_form['income'] ?? ''}') ?? 0;
                        return Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          decoration: BoxDecoration(color: const Color(0xFFF1F8E9), border: Border.all(color: const Color(0xFFC8E6C9)), borderRadius: BorderRadius.circular(10)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('AUTO-FILLED FROM PERSONAL INFO / EMPLOYMENT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _RMColors.sub, letterSpacing: 0.4)),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 24,
                                runSpacing: 8,
                                children: [
                                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    const Text('OCCUPATION', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF7A9260), letterSpacing: 0.5)),
                                    const SizedBox(height: 2),
                                    Text(occupation.isEmpty ? '—' : occupation, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _RMColors.dark)),
                                  ]),
                                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    const Text('MONTHLY INCOME', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF7A9260), letterSpacing: 0.5)),
                                    const SizedBox(height: 2),
                                    Text('₱${income.toStringAsFixed(0)}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _RMColors.dark)),
                                  ]),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text.rich(
                                TextSpan(
                                  text: 'Gamit na ang Occupation at Monthly Income na inilagay sa Personal Info tab. Pumunta sa ',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF558B2F), height: 1.5),
                                  children: const [
                                    TextSpan(text: 'Personal Info', style: TextStyle(fontWeight: FontWeight.w700)),
                                    TextSpan(text: ' tab kung kailangan itong baguhin.'),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ),
                    _selectField('job_type', 'Employment Type', const ['Employed', 'Self-Employed', 'Business', 'Freelance', 'Other'], required: true),
                  ],
                ],
              ),
            );
          }),
        ],
      );
    }

    // Tab 3 = Account Info
    if (_result == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 40),
        child: Center(child: Text('Complete all tabs first, then submit to generate credentials.', textAlign: TextAlign.center, style: TextStyle(color: _RMColors.sub))),
      );
    }
    final memberName = '${_form['first_name']} ${_form['last_name']}';
    return Column(
      children: [
        const Icon(Icons.celebration_outlined, size: 40, color: _RMColors.green),
        const SizedBox(height: 8),
        Text('$memberName is now an official member!', textAlign: TextAlign.center, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: _RMColors.dark)),
        const SizedBox(height: 4),
        const Text('Share the credentials below with the member.', style: TextStyle(fontSize: 12, color: _RMColors.sub)),
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: const Color(0xFFF1F8E9), borderRadius: BorderRadius.circular(10)),
          child: Column(
            children: [
              _CredRow('Member ID', '${_result!['member_id'] ?? ''}'),
              _CredRow('Username', '${_result!['username'] ?? ''}'),
              _CredRow('Password', '${_result!['plain_password'] ?? ''}'),
              _CredRow('Status', 'Active'),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(color: const Color(0xFFFFF8E1), borderRadius: BorderRadius.circular(8), border: const Border(left: BorderSide(color: Color(0xFFFF9800), width: 3))),
          child: const Text('The member can change their password anytime in My Profile after logging in.', style: TextStyle(fontSize: 11, color: Color(0xFFF57C00))),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SectionHeader({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      margin: const EdgeInsets.only(bottom: 2),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFE8F5E9), width: 2))),
      child: Row(children: [
        Icon(icon, size: 15, color: _RMColors.green),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: _RMColors.green, letterSpacing: 0.6)),
      ]),
    );
  }
}

class _FieldWidth extends InheritedWidget {
  final double maxWidth;
  const _FieldWidth({required this.maxWidth, required super.child});

  static double of(BuildContext context) {
    final widget = context.dependOnInheritedWidgetOfExactType<_FieldWidth>();
    return widget?.maxWidth ?? MediaQuery.of(context).size.width - 32;
  }

  @override
  bool updateShouldNotify(_FieldWidth oldWidget) => oldWidget.maxWidth != maxWidth;
}

class _FieldBox extends StatelessWidget {
  final String label;
  final Widget child;
  final bool required;
  final bool optional;
  final bool full;
  const _FieldBox({required this.label, required this.child, this.required = false, this.optional = false, this.full = false});

  @override
  Widget build(BuildContext context) {
    final available = _FieldWidth.of(context);
    // ── FIX: "BoxConstraints has a negative minimum width" — nangyayari
    // ito kapag napakaliit (o zero/negative) ang "available" width, hal.
    // habang nagta-transition/animate pa ang page o sa unang frame bago
    // pa ma-layout nang tama. Dating walang clamp dito, kaya puwedeng
    // maging negatibo ang resultang width sa SizedBox. ─────────────────
    final width = full ? double.infinity : ((available - 10) / 2).clamp(0.0, double.infinity);
    return SizedBox(
      width: width,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text.rich(
            TextSpan(text: label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _RMColors.label), children: [
              if (required) const TextSpan(text: ' *', style: TextStyle(color: _RMColors.red)),
              if (optional) const TextSpan(text: ' (optional)', style: TextStyle(fontSize: 10, color: Color(0xFFAAAAAA), fontStyle: FontStyle.italic, fontWeight: FontWeight.w500)),
            ]),
          ),
          const SizedBox(height: 4),
          child,
        ],
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final int index;
  final bool active;
  final bool done;
  final VoidCallback onTap;
  const _TabButton({required this.label, required this.index, required this.active, required this.done, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: done ? onTap : null,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: active ? _RMColors.green : Colors.transparent, width: 2))),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(radius: 9, backgroundColor: active ? _RMColors.green : const Color(0xFFE0E0E0), child: Text('${index + 1}', style: const TextStyle(fontSize: 10, color: Colors.white))),
              const SizedBox(height: 3),
              Text(label, textAlign: TextAlign.center, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: active ? _RMColors.green : _RMColors.sub), overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClassCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;
  const _ClassCard({required this.label, required this.icon, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: active ? const Color(0xFFE8F5E9) : const Color(0xFFFAFAFA),
          border: Border.all(color: active ? _RMColors.green : const Color(0xFFE0E0E0), width: 2),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Icon(icon, color: _RMColors.green, size: 26),
            const SizedBox(height: 6),
            Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _RMColors.green)),
          ],
        ),
      ),
    );
  }
}

// ── BAGO: habang nagta-type, kapag ang resultang numero ay lalampas
// sa ibinigay na max, awtomatikong hinaharang ang bagong digit
// (babalik sa dating value, hindi ito papasok). ─────────────────────
class _MaxCapFormatter extends TextInputFormatter {
  final double max;
  _MaxCapFormatter(this.max);

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    if (newValue.text.isEmpty) return newValue;
    final parsed = double.tryParse(newValue.text);
    if (parsed == null) return oldValue;
    if (parsed > max) return oldValue;
    return newValue;
  }
}

class _CredRow extends StatelessWidget {
  final String label;
  final String value;
  const _CredRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: _RMColors.sub, fontWeight: FontWeight.w600)),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _RMColors.dark, fontFamily: 'monospace')),
        ],
      ),
    );
  }
}