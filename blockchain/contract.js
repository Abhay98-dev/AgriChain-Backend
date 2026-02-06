const { ethers } = require("ethers");
const { signer } = require("./provider");

// IMPORTANT: extract .abi
const abi = require("./abi/CropBatch.json").abi;

const contract = new ethers.Contract(
  process.env.CROPBATCH_CONTRACT,
  abi,
  signer
);

module.exports = contract;