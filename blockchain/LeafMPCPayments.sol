// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * LeafMPCPayments.sol
 * Smart contract for LEAF MPC cooperative payment recording on Polygon
 * Deploy on: Polygon Amoy Testnet (testing) or Polygon Mainnet (production)
 */
contract LeafMPCPayments {

    address public owner;

    struct PaymentRecord {
        string  txId;
        string  memberId;
        string  loanId;
        uint256 amount;       // amount × 100 (e.g. ₱1,500 = 150000)
        string  dataHash;     // SHA-256 hash from backend
        uint256 timestamp;
        bool    exists;
    }

    mapping(string => PaymentRecord) public payments;
    string[] public paymentIds;

    event PaymentRecorded(
        string indexed txId,
        string  memberId,
        string  loanId,
        uint256 amount,
        string  dataHash,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function recordPayment(
        string memory txId,
        string memory memberId,
        string memory loanId,
        uint256 amount,
        string memory dataHash
    ) external onlyOwner {
        require(!payments[txId].exists, "Payment already recorded");

        payments[txId] = PaymentRecord({
            txId:      txId,
            memberId:  memberId,
            loanId:    loanId,
            amount:    amount,
            dataHash:  dataHash,
            timestamp: block.timestamp,
            exists:    true
        });

        paymentIds.push(txId);

        emit PaymentRecorded(txId, memberId, loanId, amount, dataHash, block.timestamp);
    }

    function getPayment(string memory txId) external view returns (PaymentRecord memory) {
        require(payments[txId].exists, "Payment not found");
        return payments[txId];
    }

    function getTotalPayments() external view returns (uint256) {
        return paymentIds.length;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
