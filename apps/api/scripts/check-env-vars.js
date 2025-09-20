const { ConfigService } = require('@nestjs/config');

// Let's check what the API server is actually loading as JWT_SECRET
console.log('=== ENVIRONMENT VARIABLE CHECK ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET from process.env:', process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'undefined');

// Let's also check if there are multiple .env files
const fs = require('fs');
const path = require('path');

console.log('\n=== CHECKING .ENV FILES ===');

// Check current directory
const currentEnv = path.join(process.cwd(), '.env');
if (fs.existsSync(currentEnv)) {
    console.log('✅ Found .env in current directory:', currentEnv);
    const content = fs.readFileSync(currentEnv, 'utf8');
    const jwtSecretLine = content.split('\n').find(line => line.startsWith('JWT_SECRET='));
    if (jwtSecretLine) {
        console.log('JWT_SECRET in .env file:', jwtSecretLine);
    } else {
        console.log('❌ No JWT_SECRET found in .env file');
    }
} else {
    console.log('❌ No .env file in current directory');
}

// Check parent directory (workspace root)
const parentEnv = path.join(process.cwd(), '..', '..', '.env');
if (fs.existsSync(parentEnv)) {
    console.log('✅ Found .env in parent directory:', parentEnv);
    const content = fs.readFileSync(parentEnv, 'utf8');
    const jwtSecretLine = content.split('\n').find(line => line.startsWith('JWT_SECRET='));
    if (jwtSecretLine) {
        console.log('JWT_SECRET in parent .env:', jwtSecretLine);
    }
} else {
    console.log('❌ No .env file in parent directory');
}

console.log('\n=== EXPECTED JWT_SECRET ===');
console.log('Expected: 4ac6ca5335aff1bd81b6a2ea19982d56cbc6dc0370bccc8a44a0ec326ec4c533');
console.log('Actual  :', process.env.JWT_SECRET);
console.log('Match   :', process.env.JWT_SECRET === '4ac6ca5335aff1bd81b6a2ea19982d56cbc6dc0370bccc8a44a0ec326ec4c533');