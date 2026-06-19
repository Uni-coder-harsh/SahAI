const crypto = require('crypto');

// 1. Define the 32-character secret key (Must match exactly on frontend and backend)
const SECRET_KEY = "sahai-super-secret-key-123456789"; 

// --- MOCK FRONTEND (REACT) ENCRYPTION ---
function encryptData(dataObject) {
    const iv = crypto.randomBytes(16); // Generate a random IV for this payload
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), iv);
    
    let encrypted = cipher.update(JSON.stringify(dataObject), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // The frontend sends BOTH the encrypted data and the IV used to encrypt it
    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted
    };
}

// --- MOCK BACKEND (NODE.JS) DECRYPTION ---
function decryptData(encryptedPayload) {
    try {
        const iv = Buffer.from(encryptedPayload.iv, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), iv);
        
        let decrypted = decipher.update(encryptedPayload.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    } catch (error) {
        return { error: "Decryption failed! Key mismatch or corrupted data." };
    }
}

// --- THE TEST ---
const testTelemetry = { compile_count: 5, time_spent: 120, label: "NORMAL" };
console.log("1. Original Data:", testTelemetry);

const payloadToSend = encryptData(testTelemetry);
console.log("2. Encrypted Payload (Sent over network):", payloadToSend);

const decryptedData = decryptData(payloadToSend);
console.log("3. Decrypted Data (Received by Node):", decryptedData);
