// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecureIpfsStorage {
    // Contract version for tracking
    string public constant VERSION = "1.0.0";
    
    struct FileEntry {
        string cid;
        uint256 timestamp;
        string name;
        string hash; // Added hash field for integrity verification
        address[] peopleWithAccess;
        mapping(address => string) encryptedCids; // Map of user addresses to their encrypted versions of CID
    }

    // We need to change the storage structure since FileEntry now has a mapping
    mapping(address => mapping(uint256 => FileEntry)) private userFiles;
    mapping(address => uint256) private userFileCount;
    
    mapping(string => mapping(address => bool)) private accessPermissions;
    mapping(string => address) private cidToOwner; // Track original CID owners
    mapping(address => mapping(string => bool)) private filesSharedWithUser;
    
    // Add mapping from any encrypted CID to the original owner's CID
    mapping(string => string) private encryptedCidToOwnerCid;
    
    // Add user tracking
    address[] private allUsers;
    mapping(address => bool) private isUser;

    // Add file access tracking for audit trail
    struct AccessLog {
        address user;
        uint256 timestamp;
        string action; // "accessed", "uploaded", "shared", "revoked", "deleted"
    }
    
    mapping(string => AccessLog[]) private fileAuditTrail;

    event FileStored(address indexed user, string cid, uint256 timestamp, string name);
    event FileStoredWithHash(address indexed user, string cid, uint256 timestamp, string name, string hash);
    event FileDeleted(address indexed user, string cid);
    event AccessUpdated(string cid, address indexed user, bool added, string encryptedCid);
    event AccessRevoked(string cid, address indexed user);
    event FileIntegrityVerified(address indexed user, string cid, bool isValid);
    event FileAccessed(address indexed user, string cid, uint256 timestamp);

    // Store function
    function store(string memory _cid, string memory _name) external {
        // Add user to tracking if first time
        if (!isUser[msg.sender]) {
            allUsers.push(msg.sender);
            isUser[msg.sender] = true;
        }
        
        uint256 newIndex = userFileCount[msg.sender];
        FileEntry storage newEntry = userFiles[msg.sender][newIndex];
        newEntry.cid = _cid;
        newEntry.timestamp = block.timestamp;
        newEntry.name = _name;
        
        userFileCount[msg.sender]++;
        accessPermissions[_cid][msg.sender] = true;
        cidToOwner[_cid] = msg.sender;

        // Add to audit trail
        fileAuditTrail[_cid].push(AccessLog({
            user: msg.sender,
            timestamp: block.timestamp,
            action: "uploaded"
        }));

        emit FileStored(msg.sender, _cid, block.timestamp, _name);
    }

    // Store function with file hash for integrity verification
    function storeWithHash(string memory _cid, string memory _name, string memory _hash) external {
        // Add user to tracking if first time
        if (!isUser[msg.sender]) {
            allUsers.push(msg.sender);
            isUser[msg.sender] = true;
        }
        
        uint256 newIndex = userFileCount[msg.sender];
        FileEntry storage newEntry = userFiles[msg.sender][newIndex];
        newEntry.cid = _cid;
        newEntry.timestamp = block.timestamp;
        newEntry.name = _name;
        newEntry.hash = _hash; // Store file hash for integrity verification
        
        userFileCount[msg.sender]++;
        accessPermissions[_cid][msg.sender] = true;
        cidToOwner[_cid] = msg.sender;

        // Add to audit trail
        fileAuditTrail[_cid].push(AccessLog({
            user: msg.sender,
            timestamp: block.timestamp,
            action: "uploaded_with_hash"
        }));

        emit FileStoredWithHash(msg.sender, _cid, block.timestamp, _name, _hash);
    }

    // Retrieve function
    function retrieve() external view returns (
        string[] memory cids,
        uint256[] memory timestamps,
        string[] memory names,
        address[][] memory peopleWithAccess
    ) {
        uint256 count = userFileCount[msg.sender];
        cids = new string[](count);
        timestamps = new uint256[](count);
        names = new string[](count);
        peopleWithAccess = new address[][](count);
        
        for (uint256 i = 0; i < count; i++) {
            FileEntry storage entry = userFiles[msg.sender][i];
            cids[i] = entry.cid;
            timestamps[i] = entry.timestamp;
            names[i] = entry.name;
            
            // Copy people with access
            address[] memory accessList = new address[](entry.peopleWithAccess.length);
            for (uint256 j = 0; j < entry.peopleWithAccess.length; j++) {
                accessList[j] = entry.peopleWithAccess[j];
            }
            peopleWithAccess[i] = accessList;
        }
        
        return (cids, timestamps, names, peopleWithAccess);
    }

    // Retrieve files shared with the user - needs to be updated to return encrypted CIDs
    function retrieveSharedFiles() external view returns (
        string[] memory cids,
        uint256[] memory timestamps,
        string[] memory names,
        address[] memory owners
    ) {
        // First, determine how many files are shared with this user
        uint256 sharedCount = 0;
        
        for (uint256 u = 0; u < allUsers.length; u++) {
            address owner = allUsers[u];
            if (owner == msg.sender) continue; // Skip own files
            
            uint256 ownerFileCount = userFileCount[owner];
            for (uint256 i = 0; i < ownerFileCount; i++) {
                FileEntry storage entry = userFiles[owner][i];
                string memory originCid = entry.cid;
                if (accessPermissions[originCid][msg.sender]) {
                    sharedCount++;
                }
            }
        }
        
        // Now create and populate the result arrays
        cids = new string[](sharedCount);
        timestamps = new uint256[](sharedCount);
        names = new string[](sharedCount);
        owners = new address[](sharedCount);
        
        uint256 resultIndex = 0;
        
        for (uint256 u = 0; u < allUsers.length; u++) {
            address owner = allUsers[u];
            if (owner == msg.sender) continue; // Skip own files
            
            uint256 ownerFileCount = userFileCount[owner];
            for (uint256 i = 0; i < ownerFileCount; i++) {
                FileEntry storage entry = userFiles[owner][i];
                string memory originCid = entry.cid;
                
                if (accessPermissions[originCid][msg.sender]) {
                    // Use the encrypted CID for this user
                    cids[resultIndex] = entry.encryptedCids[msg.sender];
                    timestamps[resultIndex] = entry.timestamp;
                    names[resultIndex] = entry.name;
                    owners[resultIndex] = owner;
                    resultIndex++;
                }
            }
        }
        
        return (cids, timestamps, names, owners);
    }
    
    // Get all users for admin purposes
    function getAllUsersPublic() external view returns (address[] memory) {
        return allUsers;
    }

    // Delete function - updated
    function deleteCID(string memory _cid) external {
        uint256 count = userFileCount[msg.sender];
        for (uint256 i = 0; i < count; i++) {
            if (keccak256(abi.encodePacked(userFiles[msg.sender][i].cid)) == keccak256(abi.encodePacked(_cid))) {
                // Move the last element to the position of the deleted element
                if (i != count - 1) {
                    // Copy data from the last element
                    userFiles[msg.sender][i].cid = userFiles[msg.sender][count - 1].cid;
                    userFiles[msg.sender][i].timestamp = userFiles[msg.sender][count - 1].timestamp;
                    userFiles[msg.sender][i].name = userFiles[msg.sender][count - 1].name;
                    userFiles[msg.sender][i].hash = userFiles[msg.sender][count - 1].hash; // Copy the hash as well
                    
                    // Handle peopleWithAccess array
                    delete userFiles[msg.sender][i].peopleWithAccess;
                    for (uint j = 0; j < userFiles[msg.sender][count - 1].peopleWithAccess.length; j++) {
                        userFiles[msg.sender][i].peopleWithAccess.push(
                            userFiles[msg.sender][count - 1].peopleWithAccess[j]
                        );
                    }
                }
                
                userFileCount[msg.sender]--;
                delete accessPermissions[_cid][msg.sender];
                delete cidToOwner[_cid];

                // Add to audit trail
                fileAuditTrail[_cid].push(AccessLog({
                    user: msg.sender,
                    timestamp: block.timestamp,
                    action: "deleted"
                }));

                emit FileDeleted(msg.sender, _cid);
                return;
            }
        }
        revert("CID not found");
    }

    // Update access function - modified to handle encrypted CIDs
    function updateAccess(string memory _cid, address _user, string memory _encryptedCid) external {
        require(accessPermissions[_cid][msg.sender], "You don't own this CID");

        uint256 count = userFileCount[msg.sender];
        for (uint256 i = 0; i < count; i++) {
            if (keccak256(abi.encodePacked(userFiles[msg.sender][i].cid)) == keccak256(abi.encodePacked(_cid))) {
                userFiles[msg.sender][i].peopleWithAccess.push(_user);
                // Store the encrypted version of the CID for this user
                userFiles[msg.sender][i].encryptedCids[_user] = _encryptedCid;
                accessPermissions[_cid][_user] = true;
                filesSharedWithUser[_user][_cid] = true;
                
                // Store mapping from recipient's encrypted CID to owner's CID
                encryptedCidToOwnerCid[_encryptedCid] = _cid;

                // Add to audit trail
                fileAuditTrail[_cid].push(AccessLog({
                    user: _user,
                    timestamp: block.timestamp,
                    action: "access_granted"
                }));

                emit AccessUpdated(_cid, _user, true, _encryptedCid);
                return;
            }
        }
        revert("CID not found");
    }

    // Remove access function - needs updating to handle encrypted CIDs
    function removeAccess(string memory _cid, address _user) external {
        require(accessPermissions[_cid][msg.sender], "You don't own this CID");

        uint256 count = userFileCount[msg.sender];
        for (uint256 i = 0; i < count; i++) {
            if (keccak256(abi.encodePacked(userFiles[msg.sender][i].cid)) == keccak256(abi.encodePacked(_cid))) {
                address[] storage accessList = userFiles[msg.sender][i].peopleWithAccess;
                for (uint256 j = 0; j < accessList.length; j++) {
                    if (accessList[j] == _user) {
                        accessList[j] = accessList[accessList.length - 1];
                        accessList.pop();
                        delete accessPermissions[_cid][_user];
                        delete filesSharedWithUser[_user][_cid];
                        // Delete the encrypted version for this user
                        delete userFiles[msg.sender][i].encryptedCids[_user];

                        // Add to audit trail
                        fileAuditTrail[_cid].push(AccessLog({
                            user: _user,
                            timestamp: block.timestamp,
                            action: "access_revoked"
                        }));

                        emit AccessRevoked(_cid, _user);
                        return;
                    }
                }
                revert("User not found in access list");
            }
        }
        revert("CID not found");
    }
    
    // Function to log file access for audit trail
    function logFileAccess(string memory _cid) external {
        require(accessPermissions[_cid][msg.sender], "You don't have access to this file");
        
        // Add to audit trail
        fileAuditTrail[_cid].push(AccessLog({
            user: msg.sender,
            timestamp: block.timestamp,
            action: "accessed"
        }));
        
        emit FileAccessed(msg.sender, _cid, block.timestamp);
    }
    
    // Function to get audit trail for a file
    function getFileAuditTrail(string memory _cid) external view returns (
        address[] memory users,
        uint256[] memory timestamps,
        string[] memory actions
    ) {
        // Only file owner or users with access can view audit trail
        require(
            cidToOwner[_cid] == msg.sender || accessPermissions[_cid][msg.sender], 
            "You don't have permission to view this audit trail"
        );
        
        AccessLog[] memory logs = fileAuditTrail[_cid];
        users = new address[](logs.length);
        timestamps = new uint256[](logs.length);
        actions = new string[](logs.length);
        
        for (uint256 i = 0; i < logs.length; i++) {
            users[i] = logs[i].user;
            timestamps[i] = logs[i].timestamp;
            actions[i] = logs[i].action;
        }
        
        return (users, timestamps, actions);
    }
    
    // Function to get stored hash for a file
    function getFileHash(string memory _cid) external view returns (string memory) {
        // Check if caller has access to this file
        require(accessPermissions[_cid][msg.sender], "You don't have access to this file");
        
        // Find the file in the owner's files
        address owner = cidToOwner[_cid];
        uint256 count = userFileCount[owner];
        
        for (uint256 i = 0; i < count; i++) {
            FileEntry storage entry = userFiles[owner][i];
            if (keccak256(abi.encodePacked(entry.cid)) == keccak256(abi.encodePacked(_cid))) {
                return entry.hash;
            }
        }
        
        return ""; // Return empty string if hash not found
    }
    
    // Function to verify file integrity and log the verification
    function verifyFileIntegrity(string memory _cid, bool _isValid) external {
        require(accessPermissions[_cid][msg.sender], "You don't have access to this file");
        
        // Add to audit trail
        fileAuditTrail[_cid].push(AccessLog({
            user: msg.sender,
            timestamp: block.timestamp,
            action: _isValid ? "integrity_verified" : "integrity_failed"
        }));
        
        emit FileIntegrityVerified(msg.sender, _cid, _isValid);
    }

    // Function to get the owner's CID from any encrypted CID
    function getOwnerCid(string memory _encryptedCid) external view returns (string memory) {
        return encryptedCidToOwnerCid[_encryptedCid];
    }
}
