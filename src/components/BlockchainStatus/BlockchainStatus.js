import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAppContext } from '../../context/AppContext';
import './BlockchainStatus.css';

const BlockchainStatus = () => {
  const { provider, contract, userAddress } = useAppContext();
  const [blockchainInfo, setBlockchainInfo] = useState({
    currentBlock: 0,
    networkId: 0,
    gasPrice: 0,
    totalFiles: 0,
    totalUsers: 0,
    isConnected: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (provider && contract) {
      fetchBlockchainStatus();
      
      // Set up real-time updates
      const interval = setInterval(fetchBlockchainStatus, 10000); // Update every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [provider, contract]);

  const fetchBlockchainStatus = async () => {
    try {
      if (!provider || !contract) return;
      
      // Get current block number
      const currentBlock = await provider.getBlockNumber();
      
      // Get network info
      const network = await provider.getNetwork();
      
      // Get gas price
      const gasPrice = await provider.getGasPrice();
      
      // Get contract statistics
      const allUsers = await contract.getAllUsersPublic();
      
      setBlockchainInfo({
        currentBlock,
        networkId: network.chainId,
        networkName: network.name,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
        totalUsers: allUsers.length,
        isConnected: true
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching blockchain status:', error);
      setIsLoading(false);
    }
  };

  const getNetworkName = (chainId) => {
    const networks = {
      1: 'Ethereum Mainnet',
      3: 'Ropsten Testnet',
      4: 'Rinkeby Testnet',
      5: 'Goerli Testnet',
      137: 'Polygon Mainnet',
      80001: 'Polygon Mumbai'
    };
    return networks[chainId] || `Chain ID: ${chainId}`;
  };

  const getStatusColor = (isConnected) => {
    return isConnected ? '#11998e' : '#cb356b';
  };

  return (
    <div className="blockchain-status-container">
      <div className="status-header">
        <h3>⛓️ Blockchain Status</h3>
        <div className={`status-indicator ${blockchainInfo.isConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot"></div>
          <span>{blockchainInfo.isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="status-loading">
          <div className="spinner"></div>
          <p>Loading blockchain information...</p>
        </div>
      ) : (
        <div className="status-grid">
          <div className="status-card">
            <div className="card-icon">🔗</div>
            <div className="card-content">
              <h4>Current Block</h4>
              <p className="card-value">{blockchainInfo.currentBlock.toLocaleString()}</p>
            </div>
          </div>

          <div className="status-card">
            <div className="card-icon">🌐</div>
            <div className="card-content">
              <h4>Network</h4>
              <p className="card-value">{getNetworkName(blockchainInfo.networkId)}</p>
            </div>
          </div>

          <div className="status-card">
            <div className="card-icon">⛽</div>
            <div className="card-content">
              <h4>Gas Price</h4>
              <p className="card-value">{parseFloat(blockchainInfo.gasPrice).toFixed(2)} Gwei</p>
            </div>
          </div>

          <div className="status-card">
            <div className="card-icon">👥</div>
            <div className="card-content">
              <h4>Total Users</h4>
              <p className="card-value">{blockchainInfo.totalUsers}</p>
            </div>
          </div>

          <div className="status-card full-width">
            <div className="card-icon">🏛️</div>
            <div className="card-content">
              <h4>Smart Contract</h4>
              <p className="card-value contract-address">
                {contract?.address || 'Not connected'}
              </p>
            </div>
          </div>

          <div className="status-card full-width">
            <div className="card-icon">👤</div>
            <div className="card-content">
              <h4>Connected Wallet</h4>
              <p className="card-value wallet-address">
                {userAddress || 'Not connected'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockchainStatus;
