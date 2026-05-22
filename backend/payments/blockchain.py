"""
blockchain.py — Polygon Network Integration via Web3.py
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
    from web3.exceptions import TransactionNotFound
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    logger.warning("web3 not installed. Blockchain features will use local hash only.")


# ─── Configuration ─────────────────────────────────────────────────────────────
# Load from Django settings (set these in settings.py or .env)
def get_config():
    try:
        from django.conf import settings
        return {
            'rpc_url':      getattr(settings, 'POLYGON_RPC_URL',      'https://rpc-amoy.polygon.technology'),
            'chain_id':     getattr(settings, 'POLYGON_CHAIN_ID',     80002),   # 80002=Amoy testnet, 137=Mainnet
            'private_key':  getattr(settings, 'POLYGON_PRIVATE_KEY',  None),
            'wallet_addr':  getattr(settings, 'POLYGON_WALLET_ADDR',  None),
            'contract_addr':getattr(settings, 'POLYGON_CONTRACT_ADDR',None),
        }
    except Exception:
        return {}


# ─── Connect to Polygon ────────────────────────────────────────────────────────
def get_web3():
    """Get a connected Web3 instance to Polygon network."""
    if not WEB3_AVAILABLE:
        return None
    config = get_config()
    rpc_url = config.get('rpc_url', 'https://rpc-amoy.polygon.technology')
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if w3.is_connected():
            logger.info(f"Connected to Polygon at {rpc_url}")
            return w3
        else:
            logger.error(f"Failed to connect to Polygon at {rpc_url}")
            return None
    except Exception as e:
        logger.error(f"Web3 connection error: {e}")
        return None


# ─── Smart Contract ABI (minimal — only what we need) ─────────────────────────
PAYMENT_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "txId",     "type": "string"},
            {"internalType": "string", "name": "memberId", "type": "string"},
            {"internalType": "string", "name": "loanId",   "type": "string"},
            {"internalType": "uint256","name": "amount",   "type": "uint256"},
            {"internalType": "string", "name": "dataHash", "type": "string"},
        ],
        "name": "recordPayment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True,  "internalType": "string", "name": "txId",     "type": "string"},
            {"indexed": False, "internalType": "string", "name": "memberId", "type": "string"},
            {"indexed": False, "internalType": "string", "name": "loanId",   "type": "string"},
            {"indexed": False, "internalType": "uint256","name": "amount",   "type": "uint256"},
            {"indexed": False, "internalType": "string", "name": "dataHash", "type": "string"},
            {"indexed": False, "internalType": "uint256","name": "timestamp","type": "uint256"},
        ],
        "name": "PaymentRecorded",
        "type": "event",
    },
]


# ─── Generate local SHA-256 hash ───────────────────────────────────────────────
def generate_payment_hash(tx_id: str, member_id: str, loan_id: str, amount) -> str:
    """Generate a SHA-256 hash of payment data for verification."""
    payload = json.dumps({
        'tx_id':     tx_id,
        'member_id': member_id,
        'loan_id':   loan_id,
        'amount':    str(amount),
    }, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


# ─── Record payment on Polygon blockchain ─────────────────────────────────────
def record_payment_on_blockchain(tx_id: str, member_id: str, loan_id: str, amount) -> dict:
    """
    Record a payment transaction on Polygon network.
    
    Returns:
        {
            'success': bool,
            'tx_hash': str,       # Polygon transaction hash (0x...)
            'block':   int,       # Block number
            'hash':    str,       # Local SHA-256 hash
            'network': str,       # 'polygon' or 'local'
            'explorer_url': str,  # Link to view on Polygonscan
        }
    """
    # Always generate local hash
    local_hash = generate_payment_hash(tx_id, member_id, loan_id, amount)
    
    config = get_config()
    w3     = get_web3()

    # ── Fallback: local hash only if web3 unavailable or not configured ──
    if not w3 or not config.get('private_key') or not config.get('contract_addr'):
        logger.info(f"Blockchain not configured — using local hash for {tx_id}")
        return {
            'success':      True,
            'tx_hash':      None,
            'block':        None,
            'hash':         local_hash[:32] + '...',
            'network':      'local',
            'explorer_url': None,
        }

    try:
        contract_addr = Web3.to_checksum_address(config['contract_addr'])
        wallet_addr   = Web3.to_checksum_address(config['wallet_addr'])
        contract      = w3.eth.contract(address=contract_addr, abi=PAYMENT_ABI)

        # Convert amount to smallest unit (multiply by 100 to preserve 2 decimal places)
        amount_int = int(Decimal(str(amount)) * 100)

        # Build transaction
        nonce     = w3.eth.get_transaction_count(wallet_addr)
        gas_price = w3.eth.gas_price

        tx = contract.functions.recordPayment(
            tx_id,
            member_id,
            loan_id,
            amount_int,
            local_hash,
        ).build_transaction({
            'chainId':  config['chain_id'],
            'gas':      200000,
            'gasPrice': gas_price,
            'nonce':    nonce,
            'from':     wallet_addr,
        })

        # Sign and send
        signed_tx  = w3.eth.account.sign_transaction(tx, private_key=config['private_key'])
        tx_hash    = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt    = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        chain_id = config['chain_id']
        if chain_id == 137:
            explorer = f"https://polygonscan.com/tx/{tx_hash.hex()}"
        else:
            explorer = f"https://amoy.polygonscan.com/tx/{tx_hash.hex()}"

        logger.info(f"Payment {tx_id} recorded on Polygon: {tx_hash.hex()}")

        return {
            'success':      receipt.status == 1,
            'tx_hash':      tx_hash.hex(),
            'block':        receipt.blockNumber,
            'hash':         local_hash[:32] + '...',
            'network':      'polygon',
            'explorer_url': explorer,
        }

    except Exception as e:
        logger.error(f"Blockchain transaction failed for {tx_id}: {e}")
        # Fallback to local hash — don't fail the payment
        return {
            'success':      True,
            'tx_hash':      None,
            'block':        None,
            'hash':         local_hash[:32] + '...',
            'network':      'local',
            'error':        str(e),
        }


# ─── Verify a transaction on Polygon ──────────────────────────────────────────
def verify_transaction(tx_hash: str) -> dict:
    """Verify a transaction exists on Polygon blockchain."""
    w3 = get_web3()
    if not w3 or not tx_hash or not tx_hash.startswith('0x'):
        return {'verified': False, 'reason': 'Not on blockchain'}
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        return {
            'verified':     receipt.status == 1,
            'block':        receipt.blockNumber,
            'confirmations': w3.eth.block_number - receipt.blockNumber,
        }
    except TransactionNotFound:
        return {'verified': False, 'reason': 'Transaction not found'}
    except Exception as e:
        return {'verified': False, 'reason': str(e)}


# ─── Check connection status ───────────────────────────────────────────────────
def get_network_status() -> dict:
    """Check Polygon network connection status."""
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