const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL
);

const signer = new ethers.Wallet(
  process.env.BLOCKCHAIN_PRIVATE_KEY,
  provider
);

module.exports = { provider, signer };