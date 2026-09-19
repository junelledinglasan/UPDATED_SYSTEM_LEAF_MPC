// lib/services/payments_service.dart
// Matches payments.js API calls

import 'api_client.dart';

class PaymentsService {
  static Future<List<dynamic>> getPayments() async =>
      await ApiClient.get('/payments/');

  static Future<Map<String, dynamic>> getPaymentStats() async =>
      await ApiClient.get('/payments/stats/');

  static Future<Map<String, dynamic>> recordPayment(Map<String, dynamic> data) async =>
      await ApiClient.post('/payments/', body: data);

  static Future<Map<String, dynamic>> getPayment(int id) async =>
      await ApiClient.get('/payments/$id/');

  // ── BAGO: kumuha ng Loan Release blockchain record (buong deduction
  // breakdown — interest, service fee, filing fee, insurance, savings
  // deposit, share capital CBU, net proceeds — na na-record sa Polygon
  // blockchain sa oras na na-release ang loan). HIWALAY ito sa mga
  // payment/hulog (getPayment/getPayments sa itaas) — parehong endpoint
  // ang tinatawagan ng web (`getLoanReleaseAPI`). Ibinabalik ang "null"
  // kapag walang record (hal. loan na ginawa bago pa idagdag ang
  // feature na 'to) — hindi ito error, ordinaryong resulta lang. ──────
  static Future<dynamic> getLoanRelease(int loanPk) async =>
      await ApiClient.get('/payments/loan-release/$loanPk/');
}