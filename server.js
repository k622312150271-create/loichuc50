const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Decode URL to handle Vietnamese or spaces in file names
    let safeUrl = decodeURIComponent(req.url);
    
    // Default to index.html for root path
    let filePath = path.join(__dirname, safeUrl === '/' ? 'index.html' : safeUrl);
    
    // Prevent directory traversal attacks (stay within __dirname)
    if (!filePath.startsWith(__dirname)) {
        res.statusCode = 403;
        res.end('Access Denied');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    let contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found, serve index.html if it's a SPA route or just return 404
                fs.readFile(path.join(__dirname, 'index.html'), (err2, indexContent) => {
                    if (err2) {
                        res.statusCode = 404;
                        res.end('File Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(indexContent, 'utf-8');
                    }
                });
            } else {
                res.statusCode = 500;
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, 'localhost', () => {
    console.log(`=======================================================`);
    console.log(`[LỜI CHÚC 50 NĂM] WEB SERVER ĐANG CHẠY THÀNH CÔNG!`);
    console.log(`Đường dẫn truy cập: http://localhost:${PORT}`);
    console.log(`=======================================================`);
    console.log(`Nhấn Ctrl+C trong terminal này để dừng server.`);
});
