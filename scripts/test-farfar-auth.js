const http = require('http');

// Test the new user authentication
async function testAuth() {
    const loginData = JSON.stringify({
        email: "farfar@example.com",
        password: "password123"
    });
    
    const loginOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };
    
    console.log('Testing login for farfar@example.com...');
    
    const req = http.request(loginOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('Login Status:', res.statusCode);
            console.log('Response:', data);
            
            if (res.statusCode === 200 || res.statusCode === 201) {
                try {
                    const result = JSON.parse(data);
                    const token = result.access_token;
                    console.log('\n✅ Login successful! Testing token...');
                    
                    // Test the token
                    const profileOptions = {
                        hostname: 'localhost',
                        port: 3001,
                        path: '/auth/profile',
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    };
                    
                    const profileReq = http.request(profileOptions, (profileRes) => {
                        let profileData = '';
                        profileRes.on('data', (chunk) => {
                            profileData += chunk;
                        });
                        profileRes.on('end', () => {
                            console.log('Profile Status:', profileRes.statusCode);
                            console.log('Profile Response:', profileData);
                            
                            if (profileRes.statusCode === 401) {
                                console.log('\n🚨 CONFIRMED: JWT is broken!');
                                console.log('Even fresh API tokens are rejected.');
                                console.log('Issue: JWT_SECRET mismatch in ConfigService');
                            } else if (profileRes.statusCode === 200) {
                                console.log('\n🎉 Authentication works!');
                            }
                        });
                    });
                    
                    profileReq.on('error', (err) => {
                        console.log('Profile request error:', err.message);
                    });
                    
                    profileReq.end();
                    
                } catch (e) {
                    console.log('Error parsing login response:', e.message);
                }
            } else {
                console.log('❌ Login failed');
            }
        });
    });
    
    req.on('error', (err) => {
        console.log('Login request error:', err.message);
    });
    
    req.write(loginData);
    req.end();
}

testAuth();