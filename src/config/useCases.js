// Use Case Configurations for Different Industries

export const USE_CASES = {
  HEALTHCARE: {
    name: "Healthcare Records",
    description: "HIPAA-compliant medical document storage",
    fileTypes: ['.pdf', '.dcm', '.txt'],
    requiredFields: ['patientId', 'doctorId', 'date'],
    complianceLevel: 'HIPAA',
    retentionPeriod: '7 years',
    icon: '🏥'
  },
  
  LEGAL: {
    name: "Legal Documents",
    description: "Contract and legal document notarization",
    fileTypes: ['.pdf', '.doc', '.docx'],
    requiredFields: ['caseNumber', 'clientId', 'lawyerId'],
    complianceLevel: 'SOX',
    retentionPeriod: '10 years',
    icon: '⚖️'
  },
  
  ACADEMIC: {
    name: "Academic Certificates",
    description: "Educational credential verification",
    fileTypes: ['.pdf', '.png', '.jpg'],
    requiredFields: ['studentId', 'institutionId', 'degreeType'],
    complianceLevel: 'FERPA',
    retentionPeriod: 'Permanent',
    icon: '🎓'
  },
  
  FINANCIAL: {
    name: "Financial Records",
    description: "Banking and financial document security",
    fileTypes: ['.pdf', '.csv', '.xlsx'],
    requiredFields: ['accountId', 'transactionId', 'amount'],
    complianceLevel: 'PCI DSS',
    retentionPeriod: '5 years',
    icon: '💰'
  }
};

export const getUseCaseConfig = (type) => {
  return USE_CASES[type] || USE_CASES.LEGAL;
};
