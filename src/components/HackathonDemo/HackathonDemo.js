import React, { useState, useEffect } from 'react';
import FileVerification from '../FileVerification/FileVerification';
import TamperDemo from '../TamperDemo/TamperDemo';
import AuditTrail from '../AuditTrail/AuditTrail';
import BlockchainStatus from '../BlockchainStatus/BlockchainStatus';
import './HackathonDemo.css';

const HackathonDemo = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [tamperedFile, setTamperedFile] = useState(null);
  const [demoStep, setDemoStep] = useState(0);

  const demoSteps = [
    {
      title: "Upload & Hash Generation",
      description: "Upload a file and generate SHA-256 hash",
      component: "upload"
    },
    {
      title: "Blockchain Logging",
      description: "Store file hash on blockchain with timestamp",
      component: "blockchain"
    },
    {
      title: "File Verification",
      description: "Verify file integrity using stored hash",
      component: "verification"
    },
    {
      title: "Tampering Detection",
      description: "Demonstrate how tampered files are detected",
      component: "tampering"
    },
    {
      title: "Audit Trail",
      description: "Show complete blockchain audit trail",
      component: "audit"
    }
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Generate hash would happen here
    }
  };

  const nextStep = () => {
    if (demoStep < demoSteps.length - 1) {
      setDemoStep(demoStep + 1);
    }
  };

  const prevStep = () => {
    if (demoStep > 0) {
      setDemoStep(demoStep - 1);
    }
  };

  const renderStepContent = () => {
    const currentStep = demoSteps[demoStep];
    
    switch (currentStep.component) {
      case 'upload':
        return (
          <div className="demo-content">
            <h3>📁 File Upload & Hash Generation</h3>
            <div className="file-upload-demo">
              <input
                type="file"
                onChange={handleFileUpload}
                className="file-input"
                id="demo-file-input"
              />
              <label htmlFor="demo-file-input" className="file-input-label">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Choose File for Demo
              </label>
            </div>
            {selectedFile && (
              <div className="file-info">
                <h4>✅ File Selected</h4>
                <p><strong>Name:</strong> {selectedFile.name}</p>
                <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
                <p><strong>Type:</strong> {selectedFile.type}</p>
              </div>
            )}
          </div>
        );
      
      case 'blockchain':
        return (
          <div className="demo-content">
            <BlockchainStatus />
          </div>
        );
      
      case 'verification':
        return (
          <div className="demo-content">
            {selectedFile && (
              <FileVerification 
                file={selectedFile}
                expectedHash={fileHash}
              />
            )}
          </div>
        );
      
      case 'tampering':
        return (
          <div className="demo-content">
            {selectedFile && (
              <TamperDemo 
                originalFile={selectedFile}
                onTamperedFile={setTamperedFile}
              />
            )}
          </div>
        );
      
      case 'audit':
        return (
          <div className="demo-content">
            {selectedFile && (
              <AuditTrail 
                fileData={{ 
                  name: selectedFile.name,
                  cid: 'demo-cid',
                  hash: fileHash
                }}
              />
            )}
          </div>
        );
      
      default:
        return <div>Select a demo step</div>;
    }
  };

  return (
    <div className="hackathon-demo-container">
      <div className="demo-header">
        <h1>🏆 Hackathon Demo: Blockchain File Integrity</h1>
        <p>Interactive demonstration of secure file upload with blockchain verification</p>
      </div>

      <div className="demo-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((demoStep + 1) / demoSteps.length) * 100}%` }}
          ></div>
        </div>
        <div className="step-indicators">
          {demoSteps.map((step, index) => (
            <div 
              key={index}
              className={`step-indicator ${index <= demoStep ? 'active' : ''}`}
              onClick={() => setDemoStep(index)}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-label">{step.title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="demo-main">
        <div className="step-content">
          <div className="step-header">
            <h2>{demoSteps[demoStep].title}</h2>
            <p>{demoSteps[demoStep].description}</p>
          </div>
          
          {renderStepContent()}
        </div>

        <div className="demo-navigation">
          <button 
            onClick={prevStep}
            disabled={demoStep === 0}
            className="nav-btn prev-btn"
          >
            ← Previous
          </button>
          
          <span className="step-counter">
            Step {demoStep + 1} of {demoSteps.length}
          </span>
          
          <button 
            onClick={nextStep}
            disabled={demoStep === demoSteps.length - 1}
            className="nav-btn next-btn"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default HackathonDemo;
