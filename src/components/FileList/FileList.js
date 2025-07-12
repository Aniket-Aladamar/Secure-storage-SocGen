import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import FileVerification from '../FileVerification/FileVerification';
import AuditTrail from '../AuditTrail/AuditTrail';
import './FileList.css';

const FileList = ({ files = [], type = 'own', onUpdate }) => {
  const { fetchFileFromIPFS, shareFile, revokeAccess, deleteFile, generateFileHash } = useAppContext();
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shareAddress, setShareAddress] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [activeCid, setActiveCid] = useState('');
  const [activeFile, setActiveFile] = useState(null);
  const [decryptKey, setDecryptKey] = useState('');
  const [needsDecryptKey, setNeedsDecryptKey] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharingAddress, setSharingAddress] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokingAddress, setRevokingAddress] = useState('');
  const [passwordError, setPasswordError] = useState({ show: false, message: '' });
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verifyingFile, setVerifyingFile] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const handleView = async (cid) => {
    setIsLoading(true);
    setStatusMessage('Fetching file content...');
    
    // Always reset the decryption key and require it for each file view
    setDecryptKey('');
    setViewingFile(cid);
    setFileContent(null);
    setNeedsDecryptKey(true);
    setStatusMessage('Please enter decryption key');
    setPasswordError({ show: false, message: '' });
    setIsLoading(false);
  };  const handleDecryptWithKey = async () => {
    if (!decryptKey || !viewingFile) return;
    
    setIsLoading(true);
    setStatusMessage('Decrypting file content...');
    setPasswordError({ show: false, message: '' }); // Reset error state when attempting
    
    try {
      const content = await fetchFileFromIPFS(viewingFile, decryptKey);
      setFileContent(content);
      setNeedsDecryptKey(false);
      setStatusMessage('File decrypted successfully');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Error decrypting file:', error);
      setPasswordError({ 
        show: true, 
        message: 'Failed to decrypt file. Please check your password and try again.' 
      });
      setStatusMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAccess = (cid, file) => {
    setActiveCid(cid);
    setActiveFile(file);
    setShareAddress('');
    setShowAccessModal(true);
  };

  const submitShare = async () => {
    if (!shareAddress.trim()) {
      setStatusMessage('Please enter a valid address');
      return;
    }
    
    setIsSharing(true);
    setSharingAddress(shareAddress);
    setIsLoading(true);
    setStatusMessage(`Sharing file with ${shareAddress}...`);
    
    try {
      await shareFile(activeCid, shareAddress);
      setStatusMessage('File shared successfully');
      setTimeout(() => setStatusMessage(''), 3000);
      
      const updatedPeopleWithAccess = [...(activeFile.peopleWithAccess || [])];
      if (!updatedPeopleWithAccess.includes(shareAddress)) {
        updatedPeopleWithAccess.push(shareAddress);
      }
      
      setActiveFile({
        ...activeFile,
        peopleWithAccess: updatedPeopleWithAccess
      });
      
      if (onUpdate) onUpdate();
      setShareAddress('');
    } catch (error) {
      setStatusMessage(`Error sharing file: ${error.message}`);
      console.error('Error sharing file:', error);
    } finally {
      setIsLoading(false);
      setIsSharing(false);
      setSharingAddress('');
    }
  };

  const handleRevoke = async (cid, address) => {
    setIsRevoking(true);
    setRevokingAddress(address);
    setIsLoading(true);
    setStatusMessage(`Revoking access for ${address}...`);
    
    try {
      await revokeAccess(cid, address);
      setStatusMessage('Access revoked successfully');
      setTimeout(() => setStatusMessage(''), 3000);
      
      if (activeFile && activeFile.peopleWithAccess) {
        setActiveFile({
          ...activeFile,
          peopleWithAccess: activeFile.peopleWithAccess.filter(a => a !== address)
        });
      }
      
      if (onUpdate) onUpdate();
    } catch (error) {
      setStatusMessage(`Error revoking access: ${error.message}`);
      console.error('Error revoking access:', error);
    } finally {
      setIsLoading(false);
      setIsRevoking(false);
      setRevokingAddress('');
    }
  };

  const handleDelete = async (cid) => {
    if (window.confirm('Are you sure you want to delete this file? This cannot be undone.')) {
      setIsLoading(true);
      setStatusMessage('Deleting file...');
      
      try {
        await deleteFile(cid);
        setStatusMessage('File deleted successfully');
        setTimeout(() => setStatusMessage(''), 3000);
        if (onUpdate) onUpdate();
      } catch (error) {
        setStatusMessage(`Error deleting file: ${error.message}`);
        console.error('Error deleting file:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  const handleCloseViewer = () => {
    setViewingFile(null);
    setFileContent(null);
    setDecryptKey('');
    setNeedsDecryptKey(false);
    setPasswordError({ show: false, message: '' }); // Clear password error on close
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const parsedTimestamp = typeof timestamp === 'object' && timestamp.toString 
        ? parseInt(timestamp.toString(), 10) 
        : parseInt(timestamp, 10);
        
      return new Date(parsedTimestamp * 1000).toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };

  const truncateAddress = (address) => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const tryFormatContent = (content) => {
    try {
      if (content.startsWith('data:application/json')) {
        const jsonString = atob(content.split(',')[1]);
        return JSON.stringify(JSON.parse(jsonString), null, 2);
      }
      return atob(content.split(',')[1]);
    } catch (error) {
      console.error('Error formatting content:', error);
      return 'Error formatting content';
    }
  };

  const handleVerifyIntegrity = (file) => {
    setVerifyingFile(file);
    setShowVerificationModal(true);
  };

  const handleShowAuditTrail = (file) => {
    setVerifyingFile(file);
    setShowAuditModal(true);
  };

  const handleCloseModals = () => {
    setShowVerificationModal(false);
    setShowAuditModal(false);
    setVerifyingFile(null);
  };

  const handleVerificationComplete = (result) => {
    console.log('Verification result:', result);
    // You can add additional logic here if needed
  };

  if (files.length === 0) {
    return (
      <div className="file-list-container">
        <div className="no-files">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#7c8aff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
          <p>No files found in your storage</p>
        </div>
      </div>
    );
  }
  return (
    <div className="file-list-container">
      {statusMessage && (
        <div className={`status-message ${statusMessage.includes('Incorrect') || statusMessage.includes('failed') ? 'error-message' : ''}`}>
          {statusMessage.includes('Incorrect') && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          )}
          {statusMessage}
        </div>
      )}
      
      {isLoading && (
        <div className="loading-overlay">
          <div className="loader"></div>
        </div>
      )}
      
      <table className="file-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Upload Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, index) => (
            <tr key={index}>
              <td data-label="Name">{file.name || 'Unnamed File'}</td>
              <td data-label="Upload Date">{formatTimestamp(file.timestamp)}</td>
              <td data-label="Actions" className="actions-cell">
                <button 
                  onClick={() => handleView(file.cid)}
                  className="action-btn view-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  View
                </button>
                
                <button 
                  onClick={() => handleVerifyIntegrity(file)}
                  className="action-btn verify-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M9 12l2 2 4-4"></path>
                  </svg>
                  Verify
                </button>
                
                <button 
                  onClick={() => handleShowAuditTrail(file)}
                  className="action-btn audit-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Audit
                </button>
                
                {type === 'own' && (
                  <>
                    <button 
                      onClick={() => handleViewAccess(file.cid, file)}
                      className="action-btn access-btn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      Access Management
                    </button>
                    <button 
                      onClick={() => handleDelete(file.cid)}
                      className="action-btn delete-btn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {viewingFile && (
        <div className="modal-overlay" onClick={handleCloseViewer}>
          <div className="file-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                File Viewer
              </h3>
              <button onClick={handleCloseViewer} className="close-btn">&times;</button>
            </div>
            <div className="modal-content">              {needsDecryptKey ? (
                <div className="decrypt-prompt">
                  <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#7c8aff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <h4>End-to-End Encrypted File</h4>
                  <p>Enter decryption key to view this file:</p>
                  <div className="decrypt-input-container">
                    <input 
                      type="text"
                      value={decryptKey}
                      onChange={(e) => setDecryptKey(e.target.value)}
                      placeholder="Paste your decryption key"
                      className={statusMessage.includes('Incorrect') ? 'error-input' : ''}
                      onKeyPress={(e) => e.key === 'Enter' && handleDecryptWithKey()}
                    />
                  </div>
                  <div className="decrypt-info-message">
                    <div className="info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c8aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                    </div>
                    <div className="info-text">
                      This file is encrypted with end-to-end encryption. You need the same key that was used during upload to decrypt it. If you enter an incorrect key, you'll receive an "Incorrect password" error.
                    </div>
                  </div>
                  <button 
                    onClick={handleDecryptWithKey} 
                    className="decrypt-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Decrypt & View
                  </button>
                </div>
              ) : fileContent ? (
                <div className="file-content">
                  {typeof fileContent === 'string' && fileContent.startsWith('data:image') ? (
                    <img src={fileContent} alt="File content" className="content-image" />) : typeof fileContent === 'string' && fileContent.startsWith('data:video') ? (
                    <video controls className="video-content">
                      <source src={fileContent} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : typeof fileContent === 'string' && fileContent.startsWith('data:audio') ? (
                    <audio controls>
                      <source src={fileContent} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  ) : typeof fileContent === 'string' && fileContent.startsWith('data:application/pdf') ? (
                    <iframe 
                      src={fileContent} 
                      title="PDF Viewer" 
                      className="pdf-viewer"
                      width="100%" 
                      height="500px"
                    ></iframe>
                  ) : typeof fileContent === 'string' && (fileContent.startsWith('data:text/') || fileContent.includes('data:application/json')) ? (
                    <div className="text-content formatted">
                      <pre>{tryFormatContent(fileContent)}</pre>
                    </div>
                  ) : typeof fileContent === 'string' && (
                      fileContent.startsWith('data:text/html') || 
                      fileContent.startsWith('data:text/css') ||
                      fileContent.startsWith('data:text/javascript') ||
                      fileContent.startsWith('data:application/xml')
                    ) ? (
                    <div className="code-content">
                      <pre>{tryFormatContent(fileContent)}</pre>
                    </div>
                  ) : typeof fileContent === 'string' && fileContent.startsWith('data:application/vnd.openxmlformats-officedocument') ? (
                    <div className="office-document-content">
                      <p>This is a Microsoft Office document. Please download to view the content.</p>
                      <a 
                        href={fileContent} 
                        download={activeFile && activeFile.name ? activeFile.name : "document"}
                        className="download-btn"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download Document
                      </a>
                    </div>
                  ) : (
                    <div className="text-content">
                      {typeof fileContent === 'string' && fileContent.startsWith('data:') ? (
                        <div className="generic-file-content">
                          <p>File content preview not available. You can download the file to view it.</p>
                          <a 
                            href={fileContent} 
                            download={activeFile && activeFile.name ? activeFile.name : "file"}
                            className="download-btn"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download File
                          </a>
                        </div>
                      ) : (
                        <pre>{fileContent}</pre>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="loading-content">
                  <p>Loading file content...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAccessModal && (
        <div className="modal-overlay" onClick={() => setShowAccessModal(false)}>
          <div className="access-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c8aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Access Management
              </h3>
              <button onClick={() => setShowAccessModal(false)} className="close-btn">&times;</button>
            </div>
            <div className="modal-content">
              <div className="access-list-container">
                <h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  Users with access:
                </h4>
                
                {activeFile && activeFile.peopleWithAccess && activeFile.peopleWithAccess.length > 0 ? (
                  <ul className="access-list">
                    {activeFile.peopleWithAccess.map((address, idx) => (
                      <li key={idx} className={`access-item ${revokingAddress === address ? 'transaction-loading' : ''}`}>
                        <span className="address-text">
                          {truncateAddress(address)}
                          {revokingAddress === address && (
                            <span className="transaction-status">
                              <div className="transaction-loader"></div>
                              Revoking...
                            </span>
                          )}
                        </span>
                        <button 
                          onClick={() => handleRevoke(activeCid, address)}
                          className="revoke-btn"
                          disabled={isRevoking}
                        >
                          {revokingAddress === address ? (
                            <>
                              <div className="btn-loader"></div>
                              Revoking...
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                              </svg>
                              Revoke
                            </>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="no-access">No users have been granted access to this file.</div>
                )}
              </div>

              <div className="add-user-form">
                <h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c8aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  Share with a new user
                </h4>
                <p>Enter the Ethereum address to share this file with:</p>
                <input 
                  type="text"
                  value={shareAddress}
                  onChange={(e) => setShareAddress(e.target.value)}
                  placeholder="0x..."
                  disabled={isSharing}
                />
                <button 
                  onClick={submitShare} 
                  className="share-submit-btn"
                  disabled={isSharing || !shareAddress.trim()}
                >
                  {isSharing ? (
                    <>
                      <div className="btn-loader"></div>
                      Sharing...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                        <polyline points="16 6 12 2 8 6"></polyline>
                        <line x1="12" y1="2" x2="12" y2="15"></line>
                      </svg>
                      Share File
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVerificationModal && verifyingFile && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="verification-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c8aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                File Integrity Verification
              </h3>
              <button onClick={handleCloseModals} className="close-btn">&times;</button>
            </div>
            <div className="modal-content">
              <p>Verifying the integrity of the file...</p>
              <div className="verification-loader">
                <div className="loader"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && verifyingFile && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c8aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                Audit Trail
              </h3>
              <button onClick={handleCloseModals} className="close-btn">&times;</button>
            </div>
            <div className="modal-content">
              <p>Fetching audit trail data...</p>
              <div className="audit-loader">
                <div className="loader"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Verification Modal */}
      {showVerificationModal && verifyingFile && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>File Integrity Verification</h3>
              <button className="close-btn" onClick={handleCloseModals}>×</button>
            </div>
            <div className="modal-body">
              <p>To verify file integrity, please upload the original file and we'll check if it matches the stored hash.</p>
              <div className="file-info">
                <p><strong>File:</strong> {verifyingFile.name}</p>
                <p><strong>CID:</strong> {verifyingFile.cid}</p>
                <p><strong>Upload Date:</strong> {new Date(parseInt(verifyingFile.timestamp) * 1000).toLocaleString()}</p>
              </div>
              <div className="verification-section">
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Create a simple file verification component inline
                      const verifyFile = async () => {
                        try {
                          const fileHash = await generateFileHash(file);
                          const savedKeys = JSON.parse(localStorage.getItem('savedEncryptionKeys') || '{}');
                          const fileData = savedKeys[verifyingFile.cid];
                          
                          if (fileData && fileData.hash) {
                            const isValid = fileHash === fileData.hash;
                            alert(isValid ? 'File integrity verified ✅' : 'File has been tampered with ❌');
                          } else {
                            alert('No stored hash found for this file. Cannot verify integrity.');
                          }
                        } catch (error) {
                          alert('Error verifying file: ' + error.message);
                        }
                      };
                      verifyFile();
                    }
                  }}
                  accept="*/*"
                />
                <p className="help-text">Select the original file to verify its integrity</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {showAuditModal && verifyingFile && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Audit Trail</h3>
              <button className="close-btn" onClick={handleCloseModals}>×</button>
            </div>
            <AuditTrail
              file={verifyingFile}
              cid={verifyingFile.cid}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FileList;