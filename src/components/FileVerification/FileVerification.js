import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import './FileVerification.css';

const FileVerification = ({ file, expectedHash, onVerificationComplete }) => {
  const { verifyFileIntegrity } = useAppContext();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const handleVerification = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyFileIntegrity(file, expectedHash);
      setVerificationResult(result);
      if (onVerificationComplete) {
        onVerificationComplete(result);
      }
    } catch (error) {
      setVerificationResult({
        isValid: false,
        message: 'Verification failed: ' + error.message
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="file-verification-container">
      <div className="verification-header">
        <h3>🔍 File Integrity Verification</h3>
        <p>Verify file hasn't been tampered with using blockchain-stored hash</p>
      </div>
      
      <div className="verification-info">
        <div className="hash-display">
          <label>Expected Hash (from Blockchain):</label>
          <code>{expectedHash}</code>
        </div>
        
        {verificationResult && (
          <div className="hash-display">
            <label>Current File Hash:</label>
            <code>{verificationResult.currentHash}</code>
          </div>
        )}
      </div>

      <button 
        onClick={handleVerification}
        disabled={isVerifying}
        className={`verify-btn ${verificationResult ? (verificationResult.isValid ? 'verified' : 'tampered') : ''}`}
      >
        {isVerifying ? (
          <>
            <div className="spinner"></div>
            Verifying...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"></path>
              <circle cx="12" cy="12" r="9"></circle>
            </svg>
            Verify Integrity
          </>
        )}
      </button>

      {verificationResult && (
        <div className={`verification-result ${verificationResult.isValid ? 'valid' : 'invalid'}`}>
          <div className="result-icon">
            {verificationResult.isValid ? '✅' : '❌'}
          </div>
          <div className="result-message">
            <h4>{verificationResult.isValid ? 'File Verified' : 'File Tampered!'}</h4>
            <p>{verificationResult.message}</p>
            {!verificationResult.isValid && (
              <div className="security-warning">
                <strong>⚠️ Security Alert:</strong> This file has been modified and cannot be trusted.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileVerification;
