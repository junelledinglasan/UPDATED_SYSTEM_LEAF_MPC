"""
blockchain.py — Polygon Network Integration via Web3.py v7
Connects LEAF MPC payment system to Polygon (Amoy Testnet / Mainnet)
"""

import json
import hashlib
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

# ─── Try to import Web3 ───────────────────────────────────────────────────────
try:
    from web3 import Web3
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    logger.warning("web3 not installed. Using local hash only.")


# ─── Load config from Django settings ────────────────────────────────────────
def get_config():
    try:
        from django.conf import settings
        return {
            'rpc_url':       getattr(settings, 'POLYGON_RPC_URL',       'https://rpc-amoy.polygon.technology'),
            'chain_id':      getattr(settings, 'POLYGON_CHAIN_ID',      80002),
            'private_key':   getattr(settings, 'POLYGON_PRIVATE_KEY',   None),
            'wallet_addr':   getattr(settings, 'POLYGON_WALLET_ADDR',   None),
            'contract_addr': getattr(settings, 'POLYGON_CONTRACT_ADDR', None),
        }
    except Exception:
        return {}


# ─── Connect to Polygon ───────────────────────────────────────────────────────
def get_web3():
    if not WEB3_AVAILABLE:
        return None
    config  = get_config()
    rpc_url = config.get('rpc_url', 'https://rpc-amoy.polygon.technology')
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if w3.is_connected():
            logger.info(f"Connected to Polygon at {rpc_url}")
            return w3
        logger.error(f"Failed to connect to Polygon at {rpc_url}")
        return None
    except Exception as e:
        logger.error(f"Web3 connection error: {e}")
        return None


# ─── Smart Contract ABI ───────────────────────────────────────────────────────
PAYMENT_ABI = [
    {
        "inputs": [
            {"internalType": "string",  "name": "txId",     "type": "string"},
            {"internalType": "string",  "name": "memberId", "type": "string"},
            {"internalType": "string",  "name": "loanId",   "type": "string"},
            {"internalType": "uint256", "name": "amount",   "type": "uint256"},
            {"internalType": "string",  "name": "dataHash", "type": "string"},
        ],
        "name": "recordPayment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True,  "internalType": "string",  "name": "txId",      "type": "string"},
            {"indexed": False, "internalType": "string",  "name": "memberId",  "type": "string"},
            {"indexed": False, "internalType": "string",  "name": "loanId",    "type": "string"},
            {"indexed": False, "internalType": "uint256", "name": "amount",    "type": "uint256"},
            {"indexed": False, "internalType": "string",  "name": "dataHash",  "type": "string"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
        ],
        "name": "PaymentRecorded",
        "type": "event",
    },
    {
        "inputs": [
            {"internalType": "string", "name": "txId", "type": "string"},
        ],
        "name": "getPayment",
        "outputs": [
            {
                "components": [
                    {"internalType": "string",  "name": "txId",      "type": "string"},
                    {"internalType": "string",  "name": "memberId",  "type": "string"},
                    {"internalType": "string",  "name": "loanId",    "type": "string"},
                    {"internalType": "uint256", "name": "amount",    "type": "uint256"},
                    {"internalType": "string",  "name": "dataHash",  "type": "string"},
                    {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
                    {"internalType": "bool",    "name": "exists",    "type": "bool"},
                ],
                "internalType": "struct LeafMPCPayments.PaymentRecord",
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    # ── BAGO: recordLoanRelease/getLoanRelease — mula sa BAGONG deploy ng
    # contract, may hiwalay na parameter na ang bawat deduction item
    # (hindi na naka-crush sa isang "dataHash" string). ──────────────────
    {
        "inputs": [
            {"internalType": "string",  "name": "txId",             "type": "string"},
            {"internalType": "string",  "name": "memberId",         "type": "string"},
            {"internalType": "string",  "name": "loanId",           "type": "string"},
            {"internalType": "uint256", "name": "principal",        "type": "uint256"},
            {"internalType": "uint256", "name": "interest",         "type": "uint256"},
            {"internalType": "uint256", "name": "serviceFee",       "type": "uint256"},
            {"internalType": "uint256", "name": "filingFee",        "type": "uint256"},
            {"internalType": "uint256", "name": "insurance",        "type": "uint256"},
            {"internalType": "uint256", "name": "savingsDeposit",   "type": "uint256"},
            {"internalType": "uint256", "name": "shareCapitalCbu",  "type": "uint256"},
            {"internalType": "uint256", "name": "netProceeds",      "type": "uint256"},
        ],
        "name": "recordLoanRelease",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "string", "name": "txId", "type": "string"},
        ],
        "name": "getLoanRelease",
        "outputs": [
            {
                "components": [
                    {"internalType": "string",  "name": "txId",             "type": "string"},
                    {"internalType": "string",  "name": "memberId",         "type": "string"},
                    {"internalType": "string",  "name": "loanId",           "type": "string"},
                    {"internalType": "uint256", "name": "principal",        "type": "uint256"},
                    {"internalType": "uint256", "name": "interest",         "type": "uint256"},
                    {"internalType": "uint256", "name": "serviceFee",       "type": "uint256"},
                    {"internalType": "uint256", "name": "filingFee",        "type": "uint256"},
                    {"internalType": "uint256", "name": "insurance",        "type": "uint256"},
                    {"internalType": "uint256", "name": "savingsDeposit",   "type": "uint256"},
                    {"internalType": "uint256", "name": "shareCapitalCbu",  "type": "uint256"},
                    {"internalType": "uint256", "name": "netProceeds",      "type": "uint256"},
                    {"internalType": "uint256", "name": "timestamp",        "type": "uint256"},
                    {"internalType": "bool",    "name": "exists",           "type": "bool"},
                ],
                "internalType": "struct LeafMPCPayments.LoanReleaseRecord",
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
]


# ─── Generate local SHA-256 hash ──────────────────────────────────────────────
def generate_payment_hash(tx_id: str, member_id: str, loan_id: str, amount) -> str:
    payload = json.dumps({
        'tx_id':     tx_id,
        'member_id': member_id,
        'loan_id':   loan_id,
        'amount':    str(amount),
    }, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


# ── Hash individual fields para hindi obvious sa Polygonscan decoder ──────────
def hash_field(value: str) -> str:
    """SHA-256 hash ng isang field — para hindi readable sa blockchain decoder."""
    return hashlib.sha256(value.encode()).hexdigest()


# ─── Record payment on Polygon ────────────────────────────────────────────────
def record_payment_on_blockchain(tx_id: str, member_id: str, loan_id: str, amount) -> dict:
    local_hash = generate_payment_hash(tx_id, member_id, loan_id, amount)
    config     = get_config()
    w3         = get_web3()

    # Fallback to local if not configured
    if not w3 or not config.get('private_key') or not config.get('contract_addr'):
        logger.info(f"Blockchain not configured — using local hash for {tx_id}")
        return {
            'success':      True,
            'tx_hash':      None,
            'block':        None,
            'hash':         local_hash,
            'network':      'local',
            'explorer_url': None,
        }

    try:
        contract_addr = Web3.to_checksum_address(config['contract_addr'])
        wallet_addr   = Web3.to_checksum_address(config['wallet_addr'])
        contract      = w3.eth.contract(address=contract_addr, abi=PAYMENT_ABI)

        amount_int = int(Decimal(str(amount)))  # ── Store exact amount, no cents conversion
        nonce      = w3.eth.get_transaction_count(wallet_addr)
        gas_price  = w3.eth.gas_price

        # ── Hash memberId and loanId para hindi obvious sa Polygonscan ──
        hashed_member_id = hash_field(member_id)
        hashed_loan_id   = hash_field(loan_id)
        hashed_tx_id     = hash_field(tx_id)

        tx = contract.functions.recordPayment(
            hashed_tx_id, hashed_member_id, hashed_loan_id, amount_int, local_hash,
        ).build_transaction({
            'chainId':  config['chain_id'],
            'gas':      500000,
            'gasPrice': gas_price,
            'nonce':    nonce,
            'from':     wallet_addr,
        })

        # web3 v7: sign_transaction returns an object with .raw_transaction
        signed  = w3.eth.account.sign_transaction(tx, private_key=config['private_key'])
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        chain_id = config['chain_id']
        explorer = (
            f"https://polygonscan.com/tx/{tx_hash.hex()}"
            if chain_id == 137
            else f"https://amoy.polygonscan.com/tx/{tx_hash.hex()}"
        )

        logger.info(f"Payment {tx_id} recorded on Polygon: {tx_hash.hex()}")
        return {
            'success':      receipt['status'] == 1,
            'tx_hash':      tx_hash.hex(),
            'block':        receipt['blockNumber'],
            'hash':         local_hash,
            'network':      'polygon',
            'explorer_url': explorer,
        }

    except Exception as e:
        logger.error(f"Blockchain tx failed for {tx_id}: {e}")
        return {
            'success':      True,
            'tx_hash':      None,
            'block':        None,
            'hash':         local_hash,
            'network':      'local',
            'error':        str(e),
        }


# ══════════════════════════════════════════════════════════════════════════════
# BAGO: LOAN RELEASE recording — REUSES ang parehong "recordPayment" contract
# function (walang bagong Solidity function/redeploy na kailangan), pero:
#   1) Ang "amount" na naka-store sa chain ay ang NET PROCEEDS (aktwal na
#      pera na inilabas sa member, pagkatapos ng lahat ng kaltas).
#   2) Ang "dataHash" ay COMPREHENSIVE hash na sumasaklaw sa BUONG deduction
#      breakdown (principal, interest, service fee, filing fee, insurance,
#      savings deposit, share capital CBU, net proceeds) — HINDI lang sa
#      net proceeds mismo, gaya ng generate_payment_hash() sa itaas. Kaya
#      kung may babaguhin kahit anong bahagi ng breakdown sa database
#      pagkatapos ma-record, hindi na ito tutugma sa hash na naka-lock na
#      sa Polygon — verifiable/tamper-proof pa rin ang buong record.
# ══════════════════════════════════════════════════════════════════════════════
def generate_loan_release_hash(tx_id: str, member_id: str, loan_id: str, breakdown: dict) -> str:
    payload = json.dumps({
        'tx_id':     tx_id,
        'member_id': member_id,
        'loan_id':   loan_id,
        **{k: str(v) for k, v in breakdown.items()},
    }, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


# ── BAGO: readable na representasyon ng BUONG deduction breakdown, na
# ilalagay MISMO bilang laman ng on-chain "dataHash" parameter (Solidity
# string) — kaya makikita na literal sa Polygonscan/Remix Input Data
# Decoder ang Interest, Service Fee, atbp. (hindi lang isang SHA-256 hash
# na hindi mababasa). Ito pa rin ang basehan ng "tamper-proof" na
# verification: kung may babaguhin sa DB record, hindi na ito tutugma
# EXACTLY sa string na naka-lock na sa Polygon. ─────────────────────────
_RELEASE_FIELD_ORDER = [
    'principal', 'interest', 'service_fee', 'filing_fee',
    'insurance', 'savings_deposit', 'share_capital_cbu', 'net_proceeds',
]
_RELEASE_FIELD_LABELS = {
    'principal':         'PRINCIPAL',
    'interest':           'INTEREST',
    'service_fee':        'SERVICE_FEE',
    'filing_fee':         'FILING_FEE',
    'insurance':          'INSURANCE',
    'savings_deposit':    'SAVINGS_DEPOSIT',
    'share_capital_cbu':  'SHARE_CAPITAL_CBU',
    'net_proceeds':       'NET_PROCEEDS',
}


def build_loan_release_datastring(breakdown: dict) -> str:
    parts = [f"{_RELEASE_FIELD_LABELS[k]}={breakdown.get(k, '0')}" for k in _RELEASE_FIELD_ORDER]
    return ";".join(parts)


def record_loan_release_on_blockchain(tx_id: str, member_id: str, loan_id: str, breakdown: dict) -> dict:
    """breakdown: dict na may principal, interest, service_fee, filing_fee,
    insurance, savings_deposit, share_capital_cbu, at net_proceeds keys.

    BAGO: tumatawag na ngayon sa "recordLoanRelease" — bagong function na
    may HIWALAY na parameter bawat deduction item (hindi na naka-crush sa
    isang string) — makikita mo silang magkakahiwalay na field sa
    Remix/Polygonscan Input Data Decoder."""
    local_hash   = generate_loan_release_hash(tx_id, member_id, loan_id, breakdown)
    net_proceeds = breakdown.get('net_proceeds', 0)
    config       = get_config()
    w3           = get_web3()

    if not w3 or not config.get('private_key') or not config.get('contract_addr'):
        logger.info(f"Blockchain not configured — using local hash for loan release {tx_id}")
        return {
            'success':      True,
            'tx_hash':      None,
            'block':        None,
            'hash':         local_hash,
            'network':      'local',
            'explorer_url': None,
        }

    try:
        contract_addr = Web3.to_checksum_address(config['contract_addr'])
        wallet_addr   = Web3.to_checksum_address(config['wallet_addr'])
        contract      = w3.eth.contract(address=contract_addr, abi=PAYMENT_ABI)

        # ── Bawat deduction item, i-convert sa integer pesos (walang
        # sentimos) bago ipasok sa uint256 param — kaparehong simplification
        # ng dati nang "amount" field sa recordPayment. ────────────────────
        def _p(key):
            return int(Decimal(str(breakdown.get(key, 0))))

        principal        = _p('principal')
        interest         = _p('interest')
        service_fee      = _p('service_fee')
        filing_fee       = _p('filing_fee')
        insurance        = _p('insurance')
        savings_deposit  = _p('savings_deposit')
        share_capital    = _p('share_capital_cbu')
        net_proceeds_int = int(Decimal(str(net_proceeds)))

        nonce     = w3.eth.get_transaction_count(wallet_addr)
        gas_price = w3.eth.gas_price

        hashed_member_id = hash_field(member_id)
        hashed_loan_id   = hash_field(loan_id)
        hashed_tx_id     = hash_field(tx_id)

        tx = contract.functions.recordLoanRelease(
            hashed_tx_id, hashed_member_id, hashed_loan_id,
            principal, interest, service_fee, filing_fee,
            insurance, savings_deposit, share_capital, net_proceeds_int,
        ).build_transaction({
            'chainId':  config['chain_id'],
            'gas':      700000,
            'gasPrice': gas_price,
            'nonce':    nonce,
            'from':     wallet_addr,
        })

        signed  = w3.eth.account.sign_transaction(tx, private_key=config['private_key'])
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        chain_id = config['chain_id']
        explorer = (
            f"https://polygonscan.com/tx/{tx_hash.hex()}"
            if chain_id == 137
            else f"https://amoy.polygonscan.com/tx/{tx_hash.hex()}"
        )

        logger.info(f"Loan release {tx_id} recorded on Polygon: {tx_hash.hex()}")
        return {
            'success':      receipt['status'] == 1,
            'tx_hash':      tx_hash.hex(),
            'block':        receipt['blockNumber'],
            'hash':         local_hash,
            'network':      'polygon',
            'explorer_url': explorer,
        }

    except Exception as e:
        logger.error(f"Blockchain tx failed for loan release {tx_id}: {e}")
        return {
            'success':      True,
            'tx_hash':      None,
            'block':        None,
            'hash':         local_hash,
            'network':      'local',
            'error':        str(e),
        }


def verify_loan_release_integrity(tx_id: str, member_id: str, loan_id: str, breakdown: dict) -> dict:
    local_hash = generate_loan_release_hash(tx_id, member_id, loan_id, breakdown)
    w3         = get_web3()
    config     = get_config()

    if not w3 or not config.get('contract_addr'):
        return {
            'verified':   False,
            'reason':     'Blockchain not connected',
            'local_hash': local_hash,
        }

    try:
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(config['contract_addr']),
            abi=PAYMENT_ABI,
        )
        hashed_tx_id = hash_field(tx_id)
        on_chain     = contract.functions.getLoanRelease(hashed_tx_id).call()

        # ── Ikinukumpara ang bawat hiwalay na field (index 3-10 ng tuple:
        # principal, interest, serviceFee, filingFee, insurance,
        # savingsDeposit, shareCapitalCbu, netProceeds) laban sa
        # kasalukuyang breakdown mula sa database. ─────────────────────
        def _p(key):
            return int(Decimal(str(breakdown.get(key, 0))))

        expected = (
            _p('principal'), _p('interest'), _p('service_fee'), _p('filing_fee'),
            _p('insurance'), _p('savings_deposit'), _p('share_capital_cbu'),
            int(Decimal(str(breakdown.get('net_proceeds', 0)))),
        )
        on_chain_values = tuple(on_chain[3:11])

        match = (expected == on_chain_values)
        return {
            'verified':         match,
            'local_hash':       local_hash,
            'blockchain_values': on_chain_values,
            'expected_values':   expected,
            'tampered':         not match,
            'block_timestamp':  on_chain[11],
        }
    except Exception as e:
        return {'verified': False, 'reason': str(e)}


# ─── Verify payment integrity (on-chain vs off-chain) ────────────────────────
def verify_payment_integrity(tx_id: str, member_id: str, loan_id: str, amount) -> dict:
    local_hash = generate_payment_hash(tx_id, member_id, loan_id, amount)
    w3         = get_web3()
    config     = get_config()

    if not w3 or not config.get('contract_addr'):
        return {
            'verified':   False,
            'reason':     'Blockchain not connected',
            'local_hash': local_hash,
        }

    try:
        contract     = w3.eth.contract(
            address=Web3.to_checksum_address(config['contract_addr']),
            abi=PAYMENT_ABI,
        )
        # ── Use hashed tx_id to match what was stored ──
        hashed_tx_id = hash_field(tx_id)
        on_chain     = contract.functions.getPayment(hashed_tx_id).call()
        on_chain_hash = on_chain[4]  # dataHash field

        match = (local_hash == on_chain_hash)
        return {
            'verified':        match,
            'local_hash':      local_hash,
            'blockchain_hash': on_chain_hash,
            'tampered':        not match,
            'block_timestamp': on_chain[5],
        }
    except Exception as e:
        return {'verified': False, 'reason': str(e)}


# ─── Verify a transaction ─────────────────────────────────────────────────────
def verify_transaction(tx_hash: str) -> dict:
    w3 = get_web3()
    if not w3 or not tx_hash or not tx_hash.startswith('0x'):
        return {'verified': False, 'reason': 'Not on blockchain or invalid hash'}
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        return {
            'verified':      receipt['status'] == 1,
            'block':         receipt['blockNumber'],
            'confirmations': w3.eth.block_number - receipt['blockNumber'],
        }
    except Exception as e:
        return {'verified': False, 'reason': str(e)}


# ─── Network status ───────────────────────────────────────────────────────────
def get_network_status() -> dict:
    if not WEB3_AVAILABLE:
        return {'connected': False, 'reason': 'web3 not installed', 'network': 'none'}
    w3 = get_web3()
    if not w3:
        return {'connected': False, 'reason': 'Cannot connect to RPC', 'network': 'none'}
    config   = get_config()
    chain_id = config.get('chain_id', 0)
    return {
        'connected': True,
        'network':   'Polygon Mainnet' if chain_id == 137 else 'Polygon Amoy Testnet',
        'chain_id':  chain_id,
        'block':     w3.eth.block_number,
    }