const https = require('https');
const http = require('http');

async function testLogin() {
    try {
        console.log('=== TESTING API LOGIN ===');
        
        const loginData = {
            email: "momo@example.com",
            password: "password123"
        };
        
        console.log('Attempting login with:', loginData);
        
        const postData = JSON.stringify(loginData);
        
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const response = await new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        body: data
                    });
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.write(postData);
            req.end();
        });
        
        console.log('Response status:', response.status);
        console.log('Response body:', response.body);
        
        if (response.status === 200 || response.status === 201) {
            const data = JSON.parse(response.body);
            console.log('✅ Login successful!');
            console.log('Token:', data.access_token);
        } else {
            console.log('❌ Login failed');
            if (response.status === 401) {
                console.log('This means the user/password combination is wrong or user doesn\'t exist');
            }
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testLogin();