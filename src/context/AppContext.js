import React, { createContext, useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import { abi } from '../abi';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  // Pinata JWT token from environment variable
  const JWT = process.env.REACT_APP_PINATA_JWT;

  // Smart contract details from environment variable
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  
  // State
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [userAddress, setUserAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [savedEncryptionKeys, setSavedEncryptionKeys] = useState({});
  
  // Load saved encryption keys from localStorage
  useEffect(() => {
    const savedKeys = localStorage.getItem('encryptionKeys');
    if (savedKeys) {
      setSavedEncryptionKeys(JSON.parse(savedKeys));
    }

    // Check if wallet is connected from previous session
    checkWalletConnection();
  }, []);

  // Save encryption keys to localStorage when they change
  useEffect(() => {
    if (Object.keys(savedEncryptionKeys).length > 0) {
      localStorage.setItem('encryptionKeys', JSON.stringify(savedEncryptionKeys));
    }
  }, [savedEncryptionKeys]);

  // Check if wallet is already connected
  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await setupEthereumConnection();
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    }
  };

  // Connect to wallet
  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask to use this application");
      return false;
    }

    try {
      await setupEthereumConnection();
      return true;
    } catch (error) {
      console.error("Error connecting wallet:", error);
      return false;
    }
  };

  // Setup Ethereum connection
  const setupEthereumConnection = async () => {
    try {
      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      await ethersProvider.send("eth_requestAccounts", []);
      const ethersSigner = ethersProvider.getSigner();
      const ethersContract = new ethers.Contract(contractAddress, abi, ethersSigner);
      
      // Get the user's MetaMask address
      const address = await ethersSigner.getAddress();
      
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setContract(ethersContract);
      setUserAddress(address);
      setIsConnected(true);

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return true;
    } catch (error) {
      console.error("Error setting up Ethereum connection:", error);
      return false;
    }
  };

  // Handle account changes in MetaMask
  const handleAccountsChanged = async (accounts) => {
    if (accounts.length > 0) {
      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      const ethersSigner = ethersProvider.getSigner();
      const address = await ethersSigner.getAddress();
      
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setContract(new ethers.Contract(contractAddress, abi, ethersSigner));
      setUserAddress(address);
      setIsConnected(true);
    } else {
      setUserAddress('');
      setIsConnected(false);
    }
  };

  // Generate a random encryption key
  const generateEncryptionKey = () => {
    const randomKey = CryptoJS.lib.WordArray.random(16).toString();
    setEncryptionKey(randomKey);
    return randomKey;
  };
  
  // Set a custom encryption key
  const setCustomEncryptionKey = (customKey) => {
    if (!customKey || customKey.trim() === '') {
      throw new Error("Custom key cannot be empty");
    }
    
    // Use the original key directly instead of transforming it
    setEncryptionKey(customKey);
    return customKey;
  };

  // Encrypt a file
  const encryptFile = async (file, key = encryptionKey) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          // Get the file content as array buffer for better handling of binary data
          const fileContent = event.target.result;
          
          // Encrypt the file content using AES
          const encrypted = CryptoJS.AES.encrypt(fileContent, key).toString();
          
          // Create a new Blob with encrypted content
          const encryptedBlob = new Blob([encrypted], { type: 'text/plain' });
          const encryptedFile = new File([encryptedBlob], file.name, { 
            type: 'text/plain',
            lastModified: new Date().getTime()
          });
          
          resolve({
            encryptedFile,
            originalType: file.type,
            originalName: file.name
          });
        } catch (error) {
          console.error('Encryption error:', error);
          reject(error);
        }
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(error);
      };
      reader.readAsDataURL(file);  // Using DataURL to handle all file types
    });
  };
  // Decrypt file content
  const decryptContent = (encryptedContent, key) => {
    try {
      // Decrypt the content using AES
      const decrypted = CryptoJS.AES.decrypt(encryptedContent, key).toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error("Decryption failed. Please check your decryption key.");
      }
      return decrypted;
    } catch (error) {
      console.error("Decryption failed:", error);
      // Check if it's a Malformed UTF-8 data error which typically indicates a wrong key
      if (error.message && error.message.includes('Malformed UTF-8 data')) {
        throw new Error("Incorrect password entered. Please try again with the correct key.");
      }
      throw new Error("Decryption failed. Please check your encryption key.");
    }
  };

  // Encrypt CID with user's wallet address
  const encryptCID = (cid) => {
    if (!userAddress) {
      throw new Error("Wallet not connected. Please connect your wallet first.");
    }
    // Use the wallet address as the encryption key
    return CryptoJS.AES.encrypt(cid, userAddress).toString();
  };

  // Decrypt CID with user's wallet address
  const decryptCID = (encryptedCid) => {
    try {
      if (!userAddress) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }
      // Use the wallet address as the decryption key
      const decrypted = CryptoJS.AES.decrypt(encryptedCid, userAddress).toString(CryptoJS.enc.Utf8);
      return decrypted;
    } catch (error) {
      console.error("CID Decryption failed:", error);
      throw new Error("CID Decryption failed. Are you using the correct wallet address?");
    }
  };

  // Upload a file to Pinata and store its CID in the smart contract
  const uploadFile = async (file) => {
    if (!isConnected) {
      throw new Error("Please connect your wallet first.");
    }

    if (!encryptionKey) {
      throw new Error("Please generate an encryption key first.");
    }

    try {
      // Generate SHA-256 hash for integrity verification
      const fileHash = await generateFileHash(file);
      
      // Encrypt the file before uploading
      const { encryptedFile, originalType, originalName } = await encryptFile(file, encryptionKey);
      
      // Prepare form data for Pinata API
      const formData = new FormData();
      formData.append("file", encryptedFile);
      
      // Add metadata about the original file for later decryption
      const metadata = JSON.stringify({
        name: originalName,
        keyvalues: {
          originalType: originalType,
          originalName: originalName,
          encrypted: "true"
        }
      });
      formData.append('pinataMetadata', metadata);

      // Add pinata options
      const pinataOptions = JSON.stringify({
        cidVersion: 1
      });
      formData.append('pinataOptions', pinataOptions);

      // Make a request to Pinata API to upload the file
      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${JWT}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Pinata API error:", response.status, errorText);
        throw new Error(`Pinata API error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log("Pinata response:", responseData);

      if (!responseData.IpfsHash) {
        throw new Error(`Error uploading file to Pinata. Response: ${JSON.stringify(responseData)}`);
      }

      const cid = responseData.IpfsHash;

      // Save the encryption key and hash for this CID
      setSavedEncryptionKeys(prevKeys => ({
        ...prevKeys,
        [cid]: {
          key: encryptionKey,
          originalType: originalType,
          originalName: originalName,
          hash: fileHash,
          timestamp: new Date().toISOString()
        }
      }));

      // Encrypt the CID with wallet address before storing in smart contract
      const encryptedCID = encryptCID(cid);
      
      // Store the encrypted CID with file hash in the smart contract for integrity verification
      const tx = await contract.storeWithHash(encryptedCID, originalName, fileHash);
      
      await tx.wait();

      // Save mapping between encrypted CID and original CID
      localStorage.setItem(`encrypted_${encryptedCID}`, cid);

      return cid;
    } catch (error) {
      console.error("Error encrypting, uploading file, or storing CID:", error);
      throw error;
    }
  };

  // Retrieve files from smart contract
  const retrieveFiles = async () => {
    if (!isConnected) {
      throw new Error("Please connect your wallet first.");
    }
    
    try {
      // Use the retrieve function which now returns arrays
      const result = await contract.functions.retrieve();
      const [cids, timestamps, names, peopleWithAccessArrays] = result;
      
      const ownedFiles = [];
      for (let i = 0; i < cids.length; i++) {
        // Get the original CID from encrypted CID mapping
        const originalCid = localStorage.getItem(`encrypted_${cids[i]}`) || cids[i];
        
        // Get hash from saved encryption keys if available
        const savedKeyData = savedEncryptionKeys[originalCid] || savedEncryptionKeys[cids[i]];
        const fileHash = savedKeyData?.hash || null;
        
        ownedFiles.push({
          cid: cids[i],
          name: names[i],
          timestamp: timestamps[i].toString(),
          peopleWithAccess: peopleWithAccessArrays[i],
          hash: fileHash // Add hash for integrity verification
        });
      }
      
      // Check for shared files which now returns arrays in a different format
      const sharedResult = await contract.functions.retrieveSharedFiles();
      const [sharedCids, sharedTimestamps, sharedNames, sharedOwners] = sharedResult;
      
      const sharedFilesList = [];
      for (let i = 0; i < sharedCids.length; i++) {
        // Get the original CID from encrypted CID mapping
        const originalCid = localStorage.getItem(`encrypted_${sharedCids[i]}`) || sharedCids[i];
        
        // Get hash from saved encryption keys if available
        const savedKeyData = savedEncryptionKeys[originalCid] || savedEncryptionKeys[sharedCids[i]];
        const fileHash = savedKeyData?.hash || null;
        
        sharedFilesList.push({
          cid: sharedCids[i],
          name: sharedNames[i],
          timestamp: sharedTimestamps[i].toString(),
          owner: sharedOwners[i],
          hash: fileHash // Add hash for integrity verification
        });
      }
      
      return {
        userFiles: ownedFiles,
        sharedFiles: sharedFilesList
      };
    } catch (error) {
      console.error("Error retrieving files:", error);
      throw error;
    }
  };

  // Fetch a file from IPFS based on CID and decrypt it
  const fetchFileFromIPFS = async (cid, providedKey = null) => {
    try {
      // First, check if the CID is encrypted (starts with U2Fsd or similar pattern used by CryptoJS)
      let actualCid = cid;
      let originalCid = cid; // This will be used for logging access
      const isEncryptedCid = cid.startsWith('U2Fsd'); // Common prefix for CryptoJS encrypted content
      
      if (isEncryptedCid) {
        try {
          // Try to decrypt the CID with user's wallet address
          actualCid = decryptCID(cid);
          originalCid = actualCid; // For shared files, this is the original CID that access permissions are based on
          console.log('Decrypted CID:', actualCid);
        } catch (decryptError) {
          console.error('Failed to decrypt CID:', decryptError);
          // Continue with the original CID if decryption fails
        }
      }

      // Log file access to blockchain for audit trail - use the original CID for permissions
      if (contract && userAddress) {
        try {
          const originalCidForLogging = await getOriginalCID(cid);
          await contract.logFileAccess(originalCidForLogging);
          console.log('File access logged to blockchain');
        } catch (error) {
          console.warn('Failed to log file access:', error);
          // Continue even if logging fails
        }
      }
      
      // Try both IPFS gateways to improve reliability
      const gateways = [
        `https://ipfs.io/ipfs/${actualCid}`,
        `https://gateway.pinata.cloud/ipfs/${actualCid}`,
        `https://cloudflare-ipfs.com/ipfs/${actualCid}`
      ];
      
      let response;
      let errorMessage = '';
      
      // Try each gateway until one succeeds
      for (const url of gateways) {
        try {
          console.log('Trying gateway:', url);
          response = await fetch(url);
          if (response.ok) {
            console.log('Successfully fetched from:', url);
            break;
          }
        } catch (err) {
          errorMessage += `${url}: ${err.message}. `;
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`Failed to fetch from IPFS gateways. ${errorMessage}`);
      }

      // Get encrypted content
      const encryptedContent = await response.text();
      if (!encryptedContent) {
        throw new Error("Retrieved empty content from IPFS");
      }
      
      // Only use the provided key - don't fall back to saved keys or current key
      let decryptKey = providedKey;

      if (!decryptKey) {
        throw new Error("Decryption key not provided. Please enter your decryption key.");
      }
        try {
        // Decrypt the file content
        const decryptedContent = decryptContent(encryptedContent, decryptKey);
        return decryptedContent;
      } catch (decryptError) {
        console.error("Decryption error:", decryptError);
        // Pass through the error message from decryptContent for more specific feedback
        throw decryptError;
      }
    } catch (error) {
      console.error("Error fetching file from IPFS:", error);
      throw error;
    }
  };

  // Share a file with another user
  const shareFile = async (cid, recipientAddress) => {
    if (!isConnected) {
      throw new Error("Please connect your wallet first.");
    }

    if (!ethers.utils.isAddress(recipientAddress)) {
      throw new Error("Please enter a valid Ethereum address.");
    }

    try {
      // Check if CID is encrypted (starts with common CryptoJS pattern)
      let originalCid = cid;
      if (cid.startsWith('U2Fsd')) {
        try {
          // Decrypt CID with sender's address
          originalCid = decryptCID(cid);
          console.log('Decrypted CID:', originalCid);
        } catch (decryptError) {
          console.error('Failed to decrypt CID:', decryptError);
          throw new Error("Failed to decrypt the CID for sharing");
        }
      }
      
      // Re-encrypt the original CID with recipient's address
      const recipientEncryptedCid = CryptoJS.AES.encrypt(originalCid, recipientAddress).toString();
      
      // Share the re-encrypted CID with recipient via smart contract
      // Now using the new parameter for encryptedCid
      const tx = await contract.updateAccess(cid, recipientAddress, recipientEncryptedCid);
      await tx.wait();
      
      // Save mapping between encrypted CID and original CID for reference
      localStorage.setItem(`encrypted_${recipientEncryptedCid}`, originalCid);
      
      return tx.hash;
    } catch (error) {
      console.error("Error sharing file:", error);
      throw error;
    }
  };

  // Revoke access to a file
  const revokeAccess = async (cid, recipientAddress) => {
    if (!isConnected) {
      throw new Error("Please connect your wallet first.");
    }

    if (!ethers.utils.isAddress(recipientAddress)) {
      throw new Error("Please enter a valid Ethereum address.");
    }

    try {
      const tx = await contract.removeAccess(cid, recipientAddress);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error revoking access:", error);
      throw error;
    }
  };

  // Delete a file
  const deleteFile = async (cid) => {
    if (!isConnected) {
      throw new Error("Please connect your wallet first.");
    }

    try {
      const tx = await contract.deleteCID(cid);
      await tx.wait();
      
      // Remove encryption key for this CID if it exists
      setSavedEncryptionKeys(prevKeys => {
        const newKeys = { ...prevKeys };
        delete newKeys[cid];
        return newKeys;
      });

      return tx.hash;
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  };

  // Generate SHA-256 hash for file integrity verification
  const generateFileHash = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const fileContent = event.target.result;
          // Convert ArrayBuffer to WordArray for CryptoJS
          const wordArray = CryptoJS.lib.WordArray.create(fileContent);
          const hash = CryptoJS.SHA256(wordArray).toString();
          console.log('Generated hash for file:', file.name, 'Hash:', hash);
          resolve(hash);
        } catch (error) {
          console.error('Error generating file hash:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Verify file integrity using blockchain-stored hash
  const verifyFileIntegrity = async (file, expectedHash) => {
    try {
      const currentHash = await generateFileHash(file);
      const isValid = currentHash === expectedHash;
      
      // Log verification to blockchain for audit trail
      if (contract && userAddress) {
        try {
          // Get the original CID for smart contract access
          const cidToLog = await getOriginalCID(file.cid || file.name);
          await contract.verifyFileIntegrity(cidToLog, isValid);
          console.log('File integrity verification logged to blockchain');
        } catch (error) {
          console.warn('Failed to log integrity verification:', error);
        }
      }
      
      return {
        isValid,
        currentHash,
        expectedHash,
        message: isValid ? 'File integrity verified' : 'File has been tampered with'
      };
    } catch (error) {
      console.error('Error verifying file integrity:', error);
      throw error;
    }
  };

  // Helper function to get the original CID from encrypted CID
  const getOriginalCID = async (cid) => {
    console.log('getOriginalCID called with:', cid);
    
    // If it's an encrypted CID, try to get the owner's CID from smart contract
    if (cid.startsWith('U2Fsd') && contract) {
      try {
        console.log('Trying to get owner CID from contract for:', cid);
        const ownerCid = await contract.getOwnerCid(cid);
        console.log('Contract returned owner CID:', ownerCid);
        if (ownerCid && ownerCid.trim() !== '') {
          console.log('Using owner CID from contract:', ownerCid);
          return ownerCid; // Return the owner's CID that has permissions
        } else {
          // If no owner CID found, this might BE the owner's CID
          console.log('No owner CID found, assuming this is the owner\'s CID:', cid);
          return cid; // Return the original CID as-is
        }
      } catch (error) {
        console.warn('Failed to get owner CID from contract:', error);
        // Continue with fallback - return as-is since this might be the owner's CID
        console.log('Using original CID due to contract error:', cid);
        return cid;
      }
    }
    
    console.log('Returning CID as-is:', cid);
    return cid; // Return as-is if not encrypted
  };

  // Get file audit trail from blockchain
  const getFileAuditTrail = async (cid) => {
    try {
      if (!contract) {
        throw new Error('Contract not initialized');
      }
      
      console.log('Getting audit trail for CID:', cid);
      
      // Use the helper function to get the original CID
      const originalCid = await getOriginalCID(cid);
      console.log('Using original CID for audit trail:', originalCid);
      
      const result = await contract.getFileAuditTrail(originalCid);
      return {
        users: result[0],
        timestamps: result[1].map(t => new Date(t.toNumber() * 1000)),
        actions: result[2]
      };
    } catch (error) {
      console.error('Error getting file audit trail:', error);
      throw error;
    }
  };

  // Get stored hash from blockchain
  const getStoredHash = async (cid) => {
    try {
      if (!contract) {
        throw new Error('Contract not initialized');
      }
      
      // Get the original CID for smart contract access
      const originalCid = await getOriginalCID(cid);
      
      const storedHash = await contract.getFileHash(originalCid);
      return storedHash;
    } catch (error) {
      console.error('Error getting stored hash:', error);
      throw error;
    }
  };

  // Generate digital signature for file
  const generateDigitalSignature = async (fileHash) => {
    try {
      if (!signer) {
        throw new Error("Wallet not connected");
      }
      
      // Create a message to sign
      const message = `File Hash: ${fileHash}\nTimestamp: ${new Date().toISOString()}\nSigner: ${userAddress}`;
      
      // Sign the message
      const signature = await signer.signMessage(message);
      
      return {
        signature,
        message,
        signer: userAddress,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating digital signature:', error);
      throw error;
    }
  };

  // Verify digital signature
  const verifyDigitalSignature = async (message, signature, expectedSigner) => {
    try {
      // Recover the address from signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      
      // Check if recovered address matches expected signer
      const isValid = recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
      
      return {
        isValid,
        recoveredAddress,
        expectedSigner,
        message: isValid ? 'Signature verified' : 'Signature verification failed'
      };
    } catch (error) {
      console.error('Error verifying signature:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      isConnected,
      userAddress,
      connectWallet,
      encryptionKey,
      generateEncryptionKey,
      setCustomEncryptionKey,
      uploadFile,
      retrieveFiles,
      fetchFileFromIPFS,
      shareFile,
      revokeAccess,
      deleteFile,
      generateFileHash,
      verifyFileIntegrity,
      generateDigitalSignature,
      verifyDigitalSignature,
      getFileAuditTrail,
      getStoredHash
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;