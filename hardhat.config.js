require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const API_KEY = process.env.API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
module.exports = {
  defaultNetwork: "sepolia",
  networks: {
    hardhat: {
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 5,
    }
  },
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  mocha: {
    timeout: 40000 // 40s for running tests
  }
}