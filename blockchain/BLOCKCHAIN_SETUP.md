# LEAF MPC — Blockchain Setup Guide
## Polygon Network + Web3.py Integration

---

## 1. Install Dependencies

```bash
pip install web3==6.15.1
pip install python-dotenv
```

Add to `requirements.txt`:
```
web3==6.15.1
python-dotenv
```

---

## 2. Setup Polygon Wallet

1. Install **MetaMask** browser extension
2. Add **Polygon Amoy Testnet** (for testing):
   - Network Name: `Polygon Amoy Testnet`
   - RPC URL: `https://rpc-amoy.polygon.technology`
   - Chain ID: `80002`
   - Symbol: `MATIC`
   - Explorer: `https://amoy.polygonscan.com`

3. Get **test MATIC** (for gas fees on testnet):
   - Go to: https://faucet.polygon.technology
   - Enter your wallet address → Get free test MATIC

4. Export your **Private Key** from MetaMask:
   - Settings → Security & Privacy → Export Private Key
   - ⚠️ NEVER share this with anyone

---

## 3. Deploy Smart Contract

### Option A — Using Remix IDE (Easiest)
1. Go to https://remix.ethereum.org
2. Create new file: `LeafMPCPayments.sol`
3. Paste the contract code from `LeafMPCPayments.sol`
4. Compile with Solidity 0.8.x
5. Deploy:
   - Environment: `Injected Provider - MetaMask`
   - Network: Polygon Amoy Testnet
   - Click **Deploy**
6. Copy the **Contract Address** after deployment

### Option B — Using Hardhat (Advanced)
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
# Copy contract to contracts/ folder
npx hardhat run scripts/deploy.js --network amoy
```

---

## 4. Configure Django Settings

Add to `backend/backend/settings.py`:
```python
# ─── Polygon Blockchain Settings ────────────────────────────────────────────
import os

# Polygon Network
POLYGON_RPC_URL      = os.getenv('POLYGON_RPC_URL', 'https://rpc-amoy.polygon.technology')
POLYGON_CHAIN_ID     = int(os.getenv('POLYGON_CHAIN_ID', '80002'))  # 80002=Amoy, 137=Mainnet

# Wallet (from MetaMask — KEEP SECRET)
POLYGON_PRIVATE_KEY  = os.getenv('POLYGON_PRIVATE_KEY')   # Your wallet private key
POLYGON_WALLET_ADDR  = os.getenv('POLYGON_WALLET_ADDR')   # Your wallet address

# Smart Contract (after deployment)
POLYGON_CONTRACT_ADDR = os.getenv('POLYGON_CONTRACT_ADDR') # Deployed contract address
```

---

## 5. Add to .env file

Create `backend/.env`:
```env
# Polygon Blockchain
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_CHAIN_ID=80002
POLYGON_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
POLYGON_WALLET_ADDR=0xYOUR_WALLET_ADDRESS_HERE
POLYGON_CONTRACT_ADDR=0xDEPLOYED_CONTRACT_ADDRESS_HERE
```

⚠️ Add `.env` to `.gitignore` — NEVER commit private keys!

---

## 6. Add URL endpoints

Add to `backend/payments/urls.py`:
```python
from django.urls import path
from .views import payment_list_view, payment_stats_view, verify_payment_view, blockchain_status_view

urlpatterns = [
    path('',                    payment_list_view,      name='payments'),
    path('stats/',              payment_stats_view,     name='payment-stats'),
    path('verify/<str:tx_hash>/', verify_payment_view,  name='verify-payment'),
    path('blockchain-status/',  blockchain_status_view, name='blockchain-status'),
]
```

---

## 7. Run Migration

```bash
python manage.py makemigrations payments
python manage.py migrate
```

---

## 8. How It Works

```
Member Payment
      ↓
Django Backend (CreatePaymentSerializer)
      ↓ records locally
      ↓ calls record_payment_on_blockchain()
      ↓
Web3.py → Polygon Network
      ↓ sends transaction to smart contract
      ↓
LeafMPCPayments.sol (on Polygon)
      ↓ stores: tx_id, member_id, loan_id, amount, SHA256-hash, timestamp
      ↓
Returns: polygon_tx (0x...), block_number
      ↓
Stored in Payment.polygon_tx field
      ↓
Viewable on Polygonscan: polygonscan.com/tx/0x...
```

---

## 9. For Production (Mainnet)

Change settings to:
```env
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_CHAIN_ID=137
```

And make sure your wallet has real **MATIC** for gas fees.
Average gas cost per payment: ~0.001 MATIC (~₱0.05)

---

## 10. Verify a Transaction

```bash
# API endpoint
GET /api/payments/verify/0xYOUR_TX_HASH/

# Check network status
GET /api/payments/blockchain-status/
```

Or view directly on:
- Testnet: https://amoy.polygonscan.com/tx/0x...
- Mainnet: https://polygonscan.com/tx/0x...