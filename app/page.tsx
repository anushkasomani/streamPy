'use client'
import React, { useState } from 'react';
import { ethers, BrowserProvider } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

function SuperfluidDemo() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [flowRate, setFlowRate] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [message, setMessage] = useState('');
  const [upgradeAmount, setUpgradeAmount] = useState('');

  const CFAv1ForwarderAddress = '0xcfA132E353cB4E398080B9700609bb008eceB125';
  const GDAv1ForwarderAddress = '0x6DA13Bde224A05a288748d857b9e7DDEffd1dE08';
  
  // Common Super Tokens on Base Sepolia - Add your token here or verify it's a valid Super Token
  const COMMON_SUPER_TOKENS = [
    { name: 'fDAIx', address: '0x5d8b4c745004d192d3c0d8ef365ebf255a9277ee' },
    { name: 'fUSDCx', address: '0x20741259f9e9962065f3a1cf2bf5e5b025f6eef3' }
  ];
  // Simplified ABIs with only the functions we need
  const CFAv1ForwarderABI = [
  "function createFlow(address token, address sender, address receiver, int96 flowRate, bytes memory userData) external returns (bool)"
  ];

  const GDAv1ForwarderABI = [
  "function createPool(address token, address admin, (uint32 transferabilityForUnitsOwner, bool distributionFromAnyAddress) memory poolConfig) external returns (bool, address)"
  ];

  const ERC20ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function totalSupply() external view returns (uint256)"
  ];

  const SuperTokenABI = [
    ...ERC20ABI,
    "function upgrade(uint256 amount) external",
    "function downgrade(uint256 amount) external",
    "function underlying() external view returns (address)"
  ];

  const SuperTokenFactoryABI = [
    "function createERC20Wrapper(address underlyingToken, (string name, string symbol, address owner) memory tokenInfo) external returns (address superToken)"
  ];

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        setMessage(`Connected to ${address}`);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        setMessage('Failed to connect wallet. Please try again.');
      }
    } else {
      setMessage('Please install Metamask to use this feature.');
    }
  };

  const approveToken = async () => {
    if (!provider || !tokenAddress) {
      setMessage('Please connect wallet and enter token address.');
      return;
    }

    const signer = await provider.getSigner();
    const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, signer);

    try {
      // Approve maximum amount
      const maxApproval = ethers.MaxUint256;
      const tx = await tokenContract.approve(CFAv1ForwarderAddress, maxApproval);
      await tx.wait();
      setMessage('Token approval successful! You can now create streams.');
    } catch (error: any) {
      console.error('Error approving token:', error);
      setMessage(`Failed to approve token: ${error.reason || error.message}`);
    }
  };

  const checkBalanceAndAllowance = async () => {
    if (!provider || !tokenAddress) {
      setMessage('Please connect wallet and enter token address.');
      return;
    }

    const signer = await provider.getSigner();
    const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, signer);

    try {
      const balance = await tokenContract.balanceOf(account);
      const allowance = await tokenContract.allowance(account, CFAv1ForwarderAddress);
      
      // For Super Tokens, check if it's wrapped (has totalSupply)
      let superTokenInfo = '';
      try {
        const totalSupply = await tokenContract.totalSupply();
        superTokenInfo = ` (Super Token Total Supply: ${ethers.formatEther(totalSupply)})`;
      } catch {
        superTokenInfo = ' (Standard ERC20)';
      }
      
      setMessage(`Balance: ${ethers.formatEther(balance)}, Allowance: ${ethers.formatEther(allowance)}${superTokenInfo}`);
    } catch (error: any) {
      console.error('Error checking balance:', error);
      setMessage(`Error: ${error.reason || error.message}`);
    }
  };

  const upgradeToSuperToken = async () => {
    if (!provider || !tokenAddress || !upgradeAmount) {
      setMessage('Please connect wallet, enter Super Token address, and amount to upgrade.');
      return;
    }

    const signer = await provider.getSigner();
    const superTokenContract = new ethers.Contract(tokenAddress, SuperTokenABI, signer);

    try {
      // Convert amount to wei
      const amount = ethers.parseEther(upgradeAmount);
      const tx = await superTokenContract.upgrade(amount);
      await tx.wait();
      setMessage(`Successfully upgraded ${upgradeAmount} tokens to Super Token!`);
    } catch (error: any) {
      console.error('Error upgrading tokens:', error);
      setMessage(`Failed to upgrade: ${error.reason || error.message}`);
    }
  };

  const createStream = async () => {
    if (!provider) {
      setMessage('Please connect your wallet first.');
      return;
    }

    if (!tokenAddress || !receiverAddress || !flowRate) {
      setMessage('Please fill in all required fields.');
      return;
    }

    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CFAv1ForwarderAddress, CFAv1ForwarderABI, signer);

    try {
      // Convert flowRate to BigInt
      const flowRateValue = BigInt(flowRate);
      
      const tx = await contract.createFlow(
        tokenAddress,
        account,
        receiverAddress,
        flowRateValue,
        "0x"
      );
      await tx.wait();
      setMessage('The stream has been created successfully.');
    } catch (error: any) {
      console.error('Error creating stream:', error);
      
      // Check if it's a custom error with data
      if (error.data) {
        setMessage(`Error: ${error.reason || error.message || 'Transaction reverted. Check token balance and allowance.'}`);
      } else if (error.reason) {
        setMessage(`Error: ${error.reason}`);
      } else {
        setMessage('Failed to create stream. Make sure you have sufficient balance and the CFA has token allowance.');
      }
    }
  };

  const createPool = async () => {
    if (!provider) {
      setMessage('Please connect your wallet first.');
      return;
    }

    const signer = await provider.getSigner();
    const contract = new ethers.Contract(GDAv1ForwarderAddress, GDAv1ForwarderABI, signer);

    try {
      const poolConfig = {
        transferabilityForUnitsOwner: 0,
        distributionFromAnyAddress: false
      };
      const tx = await contract.createPool(tokenAddress, adminAddress, poolConfig);
      const receipt = await tx.wait();
      const [success, poolAddress] = receipt.events.find(e => e.event === 'PoolCreated').args;
      setMessage(`Pool created successfully at ${poolAddress}`);
    } catch (error) {
      console.error('Error creating pool:', error);
      setMessage('Failed to create pool. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: 'auto', padding: '20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>Superfluid Demo</h1>
      
      {!account ? (
        <button onClick={connectWallet} style={{ backgroundColor: 'blue', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', width: '100%' }}>Connect Wallet</button>
      ) : (
        <div>
          <p style={{ marginBottom: '10px' }}>Connected: {account}</p>
          <button onClick={() => { setProvider(null); setAccount(''); setMessage(''); }} style={{ backgroundColor: 'red', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', width: '100%' }}>Disconnect</button>
        </div>
      )}
      
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '20px' }}>Super Token Management</h2>
      
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Quick Select:</p>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {COMMON_SUPER_TOKENS.map((token) => (
          <button
            key={token.address}
            onClick={() => setTokenAddress(token.address)}
            style={{ backgroundColor: '#e0e0e0', color: 'black', padding: '8px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
          >
            {token.name}
          </button>
        ))}
      </div>
      
      <input
        placeholder="Super Token Address"
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
        style={{ width: '100%', padding: '10px', margin: '10px 0' }}
      />
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button onClick={checkBalanceAndAllowance} style={{ backgroundColor: 'purple', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', flex: 1 }}>Check Balance</button>
        <button onClick={approveToken} style={{ backgroundColor: 'orange', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', flex: 1 }}>Approve Token</button>
      </div>
      
      <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '10px' }}>Upgrade to Super Token</h3>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Enter the amount of underlying tokens to wrap into Super Tokens</p>
      <input
        placeholder="Amount to upgrade (in tokens, e.g., 100)"
        value={upgradeAmount}
        onChange={(e) => setUpgradeAmount(e.target.value)}
        style={{ width: '100%', padding: '10px', margin: '10px 0' }}
      />
      <button onClick={upgradeToSuperToken} style={{ backgroundColor: 'teal', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', width: '100%', marginBottom: '20px' }}>Upgrade to Super Token</button>
      
      <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Create Stream</h2>
      <input
        placeholder="Receiver Address"
        value={receiverAddress}
        onChange={(e) => setReceiverAddress(e.target.value)}
        style={{ width: '100%', padding: '10px', margin: '10px 0' }}
      />
      <input
        placeholder="Flow Rate"
        value={flowRate}
        onChange={(e) => setFlowRate(e.target.value)}
        style={{ width: '100%', padding: '10px', margin: '10px 0' }}
      />
      <button onClick={createStream} style={{ backgroundColor: 'green', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', width: '100%' }}>Create Stream</button>
      
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '20px' }}>Create Pool</h2>
      <input
        placeholder="Admin Address"
        value={adminAddress}
        onChange={(e) => setAdminAddress(e.target.value)}
        style={{ width: '100%', padding: '10px', margin: '10px 0' }}
      />
      <button onClick={createPool} style={{ backgroundColor: 'blue', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', width: '100%' }}>Create Pool</button>

      {message && <p style={{ marginTop: '20px', textAlign: 'center' }}>{message}</p>}
    </div>
  );
}

export default SuperfluidDemo;