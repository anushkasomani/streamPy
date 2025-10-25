# Agent-to-Agent PYUSD Streaming Platform 🚀

An autonomous agent payment network powered by Superfluid and PYUSD, built for ETHOnline x PayPal Bounty.

## 🌟 Overview

This platform enables **autonomous agents** to act as both clients and providers in a decentralized service marketplace. Each user registers an agent, and when they need a service, their agent automatically finds the best matching provider agent based on on-chain reputation. A **Superfluid PYUSD stream** then initiates between the two agents in real-time.

### Key Features

- **Agent Registry**: On-chain registration and management of autonomous agents
- **Reputation System**: Track agent performance and credibility on-chain
- **Automatic Matching**: Find the best provider based on reputation
- **Real-time Streaming**: Superfluid PYUSD streams for instant payments
- **Modern UI**: Clean, intuitive interface built with Next.js and TypeScript

## 🏗️ Architecture

### Smart Contracts

- **AgentRegistry.sol**: Handles agent registration, fetching agents, and reputation management
  - Register agents with metadata URI
  - Get all registered agents
  - Update agent reputation
  - Check individual agent details

### Frontend

Built with:
- **Next.js 15** with TypeScript
- **Ethers.js v6** for blockchain interactions
- **Superfluid** for real-time token streaming
- Modern UI with gradients and animations

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- MetaMask or compatible wallet
- Some test PYUSD (or fDAIx on Base Sepolia for testing)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000 to see the platform.

## 📋 Usage

### 1. Connect Wallet

Click "Connect Wallet" and approve the connection in your MetaMask.

### 2. Register as Agent

Once connected, click "Register as Agent" to create your autonomous agent.

### 3. View Agent Registry

See all registered agents with their reputation scores in the Agent Registry panel.

### 4. Find a Service

Click "Find Best Agent" to automatically match with the highest-reputation agent.

### 5. Start Streaming

1. Approve the Super Token (PYUSD)
2. Click "Start PYUSD Stream" to begin the payment stream

### 6. Monitor Stream

Watch the Active Stream Dashboard for real-time flow statistics.

## 🔧 Deployment

### Deploy Agent Registry Contract

1. Add your private key to `.env`:
```env
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

2. Deploy the contract:
```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

3. Update the `AGENT_REGISTRY_ADDRESS` in `app/page.tsx` with the deployed address.

## 🎯 Features Implemented

✅ Agent Registration System  
✅ On-chain Reputation Tracking  
✅ Agent Matching Logic (based on reputation)  
✅ Superfluid PYUSD Streaming Integration  
✅ Real-time Stream Dashboard  
✅ Modern, Responsive UI  
✅ Wallet Connection  
✅ Automatic Reputation Updates  
✅ Agent List Display  

## 🌐 Network Configuration

Currently configured for **Base Sepolia** testnet:
- Network: Base Sepolia
- Chain ID: 84532
- RPC URL: https://sepolia.base.org

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Blockchain**: Ethers.js v6
- **Streaming**: Superfluid Protocol
- **Smart Contracts**: Solidity 0.8.20
- **Development**: Hardhat

## 📝 Smart Contract

The `AgentRegistry` contract includes:
- `registerAgent(string metadataURI)`: Register a new agent
- `getAllAgents()`: Fetch all registered agents
- `getAgent(address)`: Get specific agent details
- `updateReputation(address)`: Increase agent reputation
- `getAgentCount()`: Get total number of agents

## 🎨 UI Features

- Gradient header with branded title
- Real-time reputation display
- Animated progress bars for stream activity
- Responsive grid layout
- Color-coded status messages
- Interactive agent selection

## 🤝 Contributing

This project was built for the ETHOnline x PayPal Bounty. Feel free to fork and extend it!

## 📄 License

MIT

## 🙏 Acknowledgments

- Superfluid Protocol for real-time streaming
- Base Network for the testnet
- PayPal for the PYUSD stablecoin
- ETHOnline for the hackathon

---

**Built with ❤️ for the decentralized future**
