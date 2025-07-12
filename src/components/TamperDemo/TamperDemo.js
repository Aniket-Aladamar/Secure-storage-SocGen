import React, { useState } from 'react';
import './TamperDemo.css';

const TamperDemo = ({ originalFile, onTamperedFile }) => {
  const [tamperedFile, setTamperedFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTamperedFile = async () => {
    if (!originalFile) return;
    
    setIsGenerating(true);
    
    try {
      // Read the original file content
      const reader = new FileReader();
      reader.onload = async (e) => {
        let content = e.target.result;
        
        // Simulate tampering based on file type
        if (originalFile.type.startsWith('text/')) {
          // For text files, add some text
          content += '\n\n[TAMPERED] This file has been modified!';
        } else if (originalFile.type.startsWith('image/')) {
          // For images, we'll just change the file name and create a different blob
          content = content.replace(/data:image\/[^;]+/, 'data:image/png'); // Change format
        } else {
          // For other files, append some bytes
          content += 'TAMPERED_DATA';
        }
        
        // Create a new file with tampered content
        const tamperedBlob = new Blob([content], { type: originalFile.type });
        const tampered = new File([tamperedBlob], originalFile.name, {
          type: originalFile.type,
          lastModified: Date.now()
        });
        
        setTamperedFile(tampered);
        if (onTamperedFile) {
          onTamperedFile(tampered);
        }
      };
      
      reader.readAsText(originalFile);
    } catch (error) {
      console.error('Error generating tampered file:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="tamper-demo-container">
      <div className="tamper-header">
        <h3>⚠️ Tampering Demonstration</h3>
        <p>Simulate file tampering to show integrity verification</p>
      </div>

      <div className="tamper-controls">
        <div className="file-comparison">
          <div className="file-info original">
            <h4>📄 Original File</h4>
            {originalFile && (
              <div className="file-details">
                <p><strong>Name:</strong> {originalFile.name}</p>
                <p><strong>Size:</strong> {(originalFile.size / 1024).toFixed(2)} KB</p>
                <p><strong>Type:</strong> {originalFile.type}</p>
              </div>
            )}
          </div>

          <div className="file-info tampered">
            <h4>🔥 Tampered File</h4>
            {tamperedFile ? (
              <div className="file-details">
                <p><strong>Name:</strong> {tamperedFile.name}</p>
                <p><strong>Size:</strong> {(tamperedFile.size / 1024).toFixed(2)} KB</p>
                <p><strong>Type:</strong> {tamperedFile.type}</p>
                <div className="tamper-indicator">
                  <span className="tamper-badge">MODIFIED</span>
                </div>
              </div>
            ) : (
              <div className="no-tamper">
                <p>No tampered file generated</p>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={generateTamperedFile}
          disabled={!originalFile || isGenerating}
          className="tamper-btn"
        >
          {isGenerating ? (
            <>
              <div className="spinner"></div>
              Generating...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 1.16-.21 2.31-.54 3.44-1.01"></path>
                <path d="M18 8L22 12L18 16"></path>
                <path d="M16 12H22"></path>
              </svg>
              Generate Tampered File
            </>
          )}
        </button>
      </div>

      {tamperedFile && (
        <div className="tamper-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h4>File Tampering Detected</h4>
            <p>
              The tampered file has been created with modified content. 
              Use this file to demonstrate how the integrity verification 
              system can detect unauthorized changes.
            </p>
            <ul>
              <li>File size has changed</li>
              <li>Content hash will be different</li>
              <li>Verification will fail</li>
              <li>Blockchain record remains unchanged</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TamperDemo;
