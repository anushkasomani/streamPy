// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgentRegistry {
    struct Agent {
        address walletAddress;
        string metadataURI;
        uint256 reputation;
        bool isActive;
        uint256 registeredAt;
    }

    mapping(address => Agent) public agents;
    address[] public agentAddresses;
    
    event AgentRegistered(address indexed agentAddress, string metadataURI);
    event ReputationUpdated(address indexed agentAddress, uint256 newReputation);
    
    function registerAgent(string memory metadataURI) public {
        require(!agents[msg.sender].isActive, "Agent already registered");
        
        agents[msg.sender] = Agent({
            walletAddress: msg.sender,
            metadataURI: metadataURI,
            reputation: 0,
            isActive: true,
            registeredAt: block.timestamp
        });
        
        agentAddresses.push(msg.sender);
        emit AgentRegistered(msg.sender, metadataURI);
    }
    
    function getAllAgents() public view returns (Agent[] memory) {
        Agent[] memory activeAgents = new Agent[](agentAddresses.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < agentAddresses.length; i++) {
            if (agents[agentAddresses[i]].isActive) {
                activeAgents[count] = agents[agentAddresses[i]];
                count++;
            }
        }
        
        // Resize array to actual count
        Agent[] memory result = new Agent[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeAgents[i];
        }
        
        return result;
    }
    
    function updateReputation(address agentAddress) public {
        require(agents[agentAddress].isActive, "Agent not registered");
        agents[agentAddress].reputation += 1;
        emit ReputationUpdated(agentAddress, agents[agentAddress].reputation);
    }
    
    function getAgent(address agentAddress) public view returns (Agent memory) {
        return agents[agentAddress];
    }
    
    function getAgentCount() public view returns (uint256) {
        return agentAddresses.length;
    }
}
