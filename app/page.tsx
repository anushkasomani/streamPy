'use client'
import React, { useState, useEffect } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import agentABI from '../utils/agent.json';
import cfaABI from '../utils/abi.json';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Agent {
  walletAddress: string;
  metadataURI: string;
  reputation: bigint;
  isActive: boolean;
  registeredAt: bigint;
}

export default function AgentPlatform() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [flowRate, setFlowRate] = useState('1000000000000'); // Default flow rate
  const [message, setMessage] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [activeStream, setActiveStream] = useState<any>(null);
  const [contractAddress, setContractAddress] = useState('0xc7e7F52eD178090098f287CF4c757fBC125Fd9CC'); // Deployed contract address
  const [balance, setBalance] = useState<string>('0');
  const [allowance, setAllowance] = useState<string>('0');

  // Contract addresses
  const AGENT_REGISTRY_ADDRESS = contractAddress;
  const PYUSD_SUPER_TOKEN = '0x8C5d3676e9C1e11722AaB97037A241E8E058BDCF'; // PYUSD Super Token
  const CFAv1ForwarderAddress = '0xcfA132E353cB4E398080B9700609bb008eceB125';

  // Use imported ABIs
  const AgentRegistryABI = agentABI;
  const CFAv1ForwarderABI = cfaABI;

  const ERC20ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
  ];

  useEffect(() => {
    if (account) {
      checkIfRegistered();
      fetchAgents();
      fetchBalance();
    }
  }, [account]);

  // Re-fetch when contract address changes
  useEffect(() => {
    if (account && AGENT_REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      checkIfRegistered();
      fetchAgents();
    }
  }, [AGENT_REGISTRY_ADDRESS]);

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

  const checkIfRegistered = async () => {
    if (!provider) return;
    
    try {
      const contract = new ethers.Contract(AGENT_REGISTRY_ADDRESS, AgentRegistryABI, provider);
      const agent = await contract.getAgent(account);
      setIsRegistered(agent.isActive);
    } catch (error) {
      console.error('Error checking registration:', error);
      setIsRegistered(false);
    }
  };

  const fetchBalance = async () => {
    if (!provider) return;

    try {
      const tokenContract = new ethers.Contract(PYUSD_SUPER_TOKEN, ERC20ABI, provider);
      const bal = await tokenContract.balanceOf(account);
      const all = await tokenContract.allowance(account, CFAv1ForwarderAddress);
      
      setBalance(ethers.formatEther(bal));
      setAllowance(ethers.formatEther(all));
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const registerAgent = async () => {
    if (!provider) {
      setMessage('Please connect your wallet first.');
      return;
    }

    const signer = await provider.getSigner();
    const contract = new ethers.Contract(AGENT_REGISTRY_ADDRESS, AgentRegistryABI, signer);

    try {
      const metadataURI = `ipfs://agent-${account.slice(0, 8)}`;
      const tx = await contract.registerAgent(metadataURI);
      await tx.wait();
      setIsRegistered(true);
      setMessage('Agent registered successfully!');
      fetchAgents();
    } catch (error: any) {
      console.error('Error registering agent:', error);
      setMessage(`Failed to register: ${error.reason || error.message}`);
    }
  };

  const fetchAgents = async () => {
    if (!provider) return;

    try {
      const contract = new ethers.Contract(AGENT_REGISTRY_ADDRESS, AgentRegistryABI, provider);
      const allAgents = await contract.getAllAgents();
      
      const formattedAgents = allAgents.map((agent: any) => ({
        walletAddress: agent.walletAddress,
        metadataURI: agent.metadataURI,
        reputation: agent.reputation,
        isActive: agent.isActive,
        registeredAt: agent.registeredAt
      }));

      setAgents(formattedAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const findBestAgent = () => {
    if (agents.length === 0) {
      setMessage('No agents available. Please wait for more agents to register.');
      return;
    }

    // Sort by reputation and select the best one
    const sortedAgents = [...agents].sort((a, b) => {
      return Number(b.reputation) - Number(a.reputation);
    });

    const matchedAgent = sortedAgents[0];
    setSelectedAgent(matchedAgent);
    setMessage(`Matched with agent: ${matchedAgent.walletAddress.slice(0, 8)}... (Reputation: ${matchedAgent.reputation})`);
  };

  const approveToken = async () => {
    if (!provider) {
      setMessage('Please connect your wallet first.');
      return;
    }

    const signer = await provider.getSigner();
    const tokenContract = new ethers.Contract(PYUSD_SUPER_TOKEN, ERC20ABI, signer);

    try {
      const maxApproval = ethers.MaxUint256;
      const tx = await tokenContract.approve(CFAv1ForwarderAddress, maxApproval);
      await tx.wait();
      setMessage('Token approved! Ready to start streaming.');
      await fetchBalance(); // Refresh balance after approval
    } catch (error: any) {
      console.error('Error approving token:', error);
      setMessage(`Failed to approve: ${error.reason || error.message}`);
    }
  };

  const startStreaming = async () => {
    if (!provider || !selectedAgent) {
      setMessage('Please select an agent first.');
      return;
    }

    // Check if trying to stream to self
    if (account.toLowerCase() === selectedAgent.walletAddress.toLowerCase()) {
      setMessage('Error: Cannot stream to yourself! Please select a different agent.');
      return;
    }

    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CFAv1ForwarderAddress, CFAv1ForwarderABI, signer);

    try {
      // Check token balance first
      const tokenContract = new ethers.Contract(PYUSD_SUPER_TOKEN, ERC20ABI, provider);
      const balance = await tokenContract.balanceOf(account);
      const flowRateValue = BigInt(flowRate);
      
      // Check allowance
      const allowance = await tokenContract.allowance(account, CFAv1ForwarderAddress);
      
      if (allowance === BigInt(0)) {
        setMessage('Error: Token not approved. Please approve the token first!');
        return;
      }

      if (balance === BigInt(0)) {
        setMessage('Error: No PYUSD balance. Please get some PYUSD tokens first!');
        return;
      }

      // Check if there's already an existing flow to this address
      try {
        const flowInfo = await contract.getFlowInfo(
          PYUSD_SUPER_TOKEN,
          account,
          selectedAgent.walletAddress
        );
        
        // If flowRate is not zero, a stream already exists
        if (flowInfo.flowRate !== BigInt(0)) {
          setMessage('Error: A stream to this agent already exists! You may need to delete it first.');
          return;
        }
      } catch (error) {
        // Flow doesn't exist, which is fine
        console.log('No existing flow found');
      }

      // Check minimum balance requirement
      // For Superfluid, you typically need a buffer amount
      const minimumBuffer = flowRateValue * BigInt(3600); // At least 1 hour of streaming
      if (balance < minimumBuffer) {
        setMessage(`Error: Insufficient balance buffer. You need at least ${ethers.formatEther(minimumBuffer)} PYUSD to maintain this flow rate.`);
        return;
      }
      
      const tx = await contract.createFlow(
        PYUSD_SUPER_TOKEN,
        account,
        selectedAgent.walletAddress,
        flowRateValue,
        "0x"
      );
      
      const receipt = await tx.wait();
      
      setActiveStream({
        from: account,
        to: selectedAgent.walletAddress,
        flowRate: flowRate,
        startTime: Date.now()
      });

      setMessage('Stream started successfully! PYUSD is now flowing.');
      
      // Update reputation
      await updateAgentReputation(selectedAgent.walletAddress);
    } catch (error: any) {
      console.error('Error creating stream:', error);
      
      // Better error messages
      let errorMessage = 'Failed to start stream. ';
      
      if (error.reason?.includes('CFA_INSUFFICIENT_BALANCE')) {
        errorMessage += 'Insufficient balance. Please get more PYUSD tokens.';
      } else if (error.reason?.includes('CFA_FWD_INVALID_FLOW_RATE')) {
        errorMessage += 'Invalid flow rate. Try a smaller flow rate value.';
      } else if (error.data) {
        const errorCode = error.data.slice(0, 10); // Get error selector
        console.log('Error code:', errorCode);
        
        if (errorCode === '0x801b6863') {
          errorMessage += 'CFA error: Transaction failed. Check your balance buffer and flow rate. Current flow rate might be too high for your balance.';
        } else {
          errorMessage += `Error code: ${errorCode}. Check console for details.`;
        }
      } else {
        errorMessage += error.reason || error.message || 'Unknown error';
      }
      
      setMessage(errorMessage);
    }
  };

  const updateAgentReputation = async (agentAddress: string) => {
    if (!provider) return;

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(AGENT_REGISTRY_ADDRESS, AgentRegistryABI, signer);
      const tx = await contract.updateReputation(agentAddress);
      await tx.wait();
      fetchAgents();
    } catch (error) {
      console.error('Error updating reputation:', error);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: 'auto', padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', color: '#000000', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '10px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🚀 Agent-to-Agent PYUSD Platform
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Autonomous Agent Payment Network powered by Superfluid
        </p>
      </div>

      {/* Wallet Connection */}
      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
        {!account ? (
          <button 
            onClick={connectWallet} 
            style={{ 
              backgroundColor: '#667eea', 
              color: 'white', 
              padding: '15px 30px', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: 'pointer', 
              width: '100%',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🔌 Connect Wallet
          </button>
        ) : (
          <div>
            <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Connected: {account}</p>
            {!isRegistered ? (
              <button 
                onClick={registerAgent}
                style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', marginRight: '10px' }}
              >
                ✨ Register as Agent
              </button>
            ) : (
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Registered Agent</span>
            )}
            <button 
              onClick={() => { setProvider(null); setAccount(''); setMessage(''); }} 
              style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', marginLeft: '10px' }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Balance Display */}
      {account && (
        <div style={{ backgroundColor: '#ecfdf5', padding: '20px', borderRadius: '10px', marginBottom: '30px', border: '2px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#065f46' }}>💰 PYUSD Balance</h2>
            <button 
              onClick={fetchBalance}
              style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
            >
              🔄 Refresh
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>PYUSD Balance</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{parseFloat(balance).toFixed(4)}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>Allowance</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: parseFloat(allowance) > 0 ? '#10b981' : '#ef4444' }}>
                {parseFloat(allowance) > 0 ? '✅ Approved' : '❌ Not Approved'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        {/* Agent Registry */}
        <div style={{ backgroundColor: '#f9fafb', padding: '25px', borderRadius: '10px', border: '2px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px', color: '#000000' }}>🤖 Agent Registry</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>{agents.length} active agents</p>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {agents.map((agent, index) => (
              <div 
                key={index}
                style={{ 
                  backgroundColor: selectedAgent?.walletAddress === agent.walletAddress ? '#dbeafe' : 'white',
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '10px',
                  border: selectedAgent?.walletAddress === agent.walletAddress ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedAgent(agent)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 'bold', fontSize: '14px' }}>Agent #{index + 1}</p>
                    <p style={{ color: '#666', fontSize: '12px' }}>{agent.walletAddress.slice(0, 10)}...</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{agent.reputation.toString()}</p>
                    <p style={{ color: '#666', fontSize: '11px' }}>Reputation</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stream Control */}
        <div style={{ backgroundColor: '#f9fafb', padding: '25px', borderRadius: '10px', border: '2px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#000000' }}>💸 Stream Control</h2>
          
          <button 
            onClick={findBestAgent}
            style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', marginBottom: '20px', fontSize: '16px', fontWeight: 'bold' }}
          >
            🎯 Find Best Agent
          </button>

          {selectedAgent && (
            <div style={{ backgroundColor: '#dbeafe', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Matched Agent:</p>
              <p style={{ fontSize: '14px', color: '#666' }}>{selectedAgent.walletAddress}</p>
              <p style={{ fontSize: '14px', marginTop: '10px' }}>
                <strong>Reputation:</strong> {selectedAgent.reputation.toString()} ⭐
              </p>
            </div>
          )}

          <input
            placeholder="Flow Rate (e.g., 1000000000000)"
            value={flowRate}
            onChange={(e) => setFlowRate(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }}
          />

          <button 
            onClick={approveToken}
            style={{ backgroundColor: '#f59e0b', color: 'white', padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}
          >
            ✅ Approve Token
          </button>

          <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#fef3c7', borderRadius: '8px', fontSize: '12px', color: '#78350f' }}>
            <strong>Note:</strong> Current flow rate: {parseFloat(ethers.formatEther(flowRate)).toFixed(9)} PYUSD/sec
            <br />
            Try a smaller value like <code>1000000000</code> (1e9 wei) if you get errors.
          </div>

          <button 
            onClick={startStreaming}
            disabled={!selectedAgent}
            style={{ 
              backgroundColor: selectedAgent ? '#10b981' : '#9ca3af', 
              color: 'white', 
              padding: '12px 20px', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: selectedAgent ? 'pointer' : 'not-allowed', 
              width: '100%',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            🌊 Start PYUSD Stream
          </button>
        </div>
      </div>

      {/* Active Stream Dashboard */}
      {activeStream && (
        <div style={{ backgroundColor: '#ecfdf5', padding: '25px', borderRadius: '10px', border: '2px solid #10b981', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#10b981' }}>
            📊 Active Stream Dashboard
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>From</p>
              <p style={{ fontWeight: 'bold' }}>{activeStream.from.slice(0, 10)}...</p>
            </div>
            
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>To</p>
              <p style={{ fontWeight: 'bold' }}>{activeStream.to.slice(0, 10)}...</p>
            </div>
            
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>Flow Rate</p>
              <p style={{ fontWeight: 'bold' }}>{ethers.formatUnits(activeStream.flowRate, 18)} tokens/sec</p>
            </div>
          </div>

          {/* Progress bar animation */}
          <div style={{ marginTop: '20px', backgroundColor: '#d1fae5', height: '8px', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <div 
              style={{ 
                backgroundColor: '#10b981', 
                height: '100%', 
                width: '100%',
                animation: 'flow 2s linear infinite'
              }}
            />
          </div>
        </div>
      )}

      {/* Status Message */}
      {message && (
        <div style={{ 
          backgroundColor: message.includes('success') ? '#d1fae5' : '#fee2e2', 
          color: message.includes('success') ? '#065f46' : '#991b1b',
          padding: '15px', 
          borderRadius: '8px',
          marginTop: '20px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          {message}
        </div>
      )}

      <style jsx>{`
        @keyframes flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}