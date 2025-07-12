import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import './AuditTrail.css';

const AuditTrail = ({ file, cid }) => {
  const { getFileAuditTrail } = useAppContext();
  const [auditEvents, setAuditEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ((file || cid) && getFileAuditTrail) {
      fetchAuditTrail();
    }
  }, [file, cid, getFileAuditTrail]);

  const fetchAuditTrail = async () => {
    setIsLoading(true);
    try {
      const fileCid = cid || (file && file.cid);
      if (!fileCid) {
        console.error('No CID provided for audit trail');
        return;
      }

      // Fetch audit trail from the smart contract
      const auditTrail = await getFileAuditTrail(fileCid);
      
      // Format events for display
      const formattedEvents = auditTrail.map(event => ({
        type: getEventTypeDisplay(event.action),
        timestamp: event.date.toLocaleString(),
        user: event.user,
        action: event.action,
        blockTime: event.timestamp
      }));

      setAuditEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      setAuditEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventTypeDisplay = (action) => {
    const actionMap = {
      'uploaded': 'File Uploaded',
      'uploaded_with_hash': 'File Uploaded (with Hash)',
      'accessed': 'File Accessed',
      'access_granted': 'Access Granted',
      'access_revoked': 'Access Revoked',
      'deleted': 'File Deleted',
      'integrity_verified': 'Integrity Verified',
      'integrity_failed': 'Integrity Check Failed'
    };
    return actionMap[action] || action;
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'File Uploaded':
      case 'File Uploaded (with Hash)':
        return '📁';
      case 'File Accessed':
        return '👁️';
      case 'Access Granted':
        return '🔓';
      case 'Access Revoked':
        return '🔒';
      case 'File Deleted':
        return '🗑️';
      case 'Integrity Verified':
        return '✅';
      case 'Integrity Check Failed':
        return '❌';
      default:
        return '📄';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'File Uploaded':
      case 'File Uploaded (with Hash)':
        return '#4CAF50';
      case 'File Accessed':
        return '#2196F3';
      case 'Access Granted':
        return '#FF9800';
      case 'Access Revoked':
        return '#F44336';
      case 'File Deleted':
        return '#9C27B0';
      case 'Integrity Verified':
        return '#4CAF50';
      case 'Integrity Check Failed':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  return (
    <div className="audit-trail-container">
      <div className="audit-header">
        <h3>📋 Blockchain Audit Trail</h3>
        <p>Immutable record of all file operations</p>
      </div>

      {isLoading ? (
        <div className="audit-loading">
          <div className="spinner"></div>
          <p>Loading audit trail...</p>
        </div>
      ) : auditEvents.length === 0 ? (
        <div className="audit-empty">
          <p>No audit events found for this file</p>
        </div>
      ) : (
        <div className="audit-timeline">
          {auditEvents.map((event, index) => (
            <div key={index} className="audit-event">
              <div className="event-icon" style={{ backgroundColor: getEventColor(event.type) }}>
                {getEventIcon(event.type)}
              </div>
              <div className="event-details">
                <div className="event-type">{event.type}</div>
                <div className="event-timestamp">{event.timestamp}</div>
                <div className="event-user">
                  <span className="user-label">User:</span>
                  <span className="user-address">{event.user}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="audit-footer">
        <p>
          <span className="security-note">🔒 Security Note:</span>
          All events are permanently recorded on the blockchain and cannot be modified or deleted.
        </p>
      </div>
    </div>
  );
};

export default AuditTrail;
