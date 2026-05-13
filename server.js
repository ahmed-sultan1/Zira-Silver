const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const app = express();

// ================= MIDDLEWARE =================
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ================= DIRECTORIES =================
const dbDir = path.join(__dirname, 'database');
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ================= STATIC =================
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/uploads', express.static(uploadDir));

// ================= MULTER =================
const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images allowed'), false);
    }
});

// ================= DB FUNCTIONS =================
const readDB = (file, isObject = false) => {
    const filePath = path.join(dbDir, `${file}.json`);

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(isObject ? {} : []));
        return isObject ? {} : [];
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return isObject ? {} : [];
    }
};

const writeDB = (file, data) => {
    fs.writeFileSync(path.join(dbDir, `${file}.json`), JSON.stringify(data, null, 2));
};

// ================= INIT DB =================
const initDB = () => {
    if (readDB('products').length === 0) writeDB('products', []);
    if (readDB('orders').length === 0) writeDB('orders', []);
    if (readDB('completed').length === 0) writeDB('completed', []);

    if (Object.keys(readDB('settings', true)).length === 0) {
        writeDB('settings', {
            storeName: "ZIRA",
            defaultShipping: 100
        });
    }

    if (readDB('admin').length === 0) {
        writeDB('admin', [{
            username: "admin",
            password: bcrypt.hashSync("123456", 10)
        }]);
    }
};

initDB();

// ================= ROUTES =================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

// ================= AUTH =================
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const admin = readDB('admin');

    if (bcrypt.compareSync(password, admin[0].password)) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// ================= PRODUCTS =================
app.get('/api/products', (req, res) => {
    res.json(readDB('products'));
});

app.post('/api/products', upload.array('images'), (req, res) => {
    try {
        const products = readDB('products');

        const newProduct = {
            id: uuidv4(),
            name: req.body.name,
            price: Number(req.body.price),
            images: req.files.map(f => `/uploads/${f.filename}`),
            createdAt: new Date()
        };

        products.push(newProduct);
        writeDB('products', products);

        res.json(newProduct);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ================= ORDERS =================
app.post('/api/orders', (req, res) => {
    const orders = readDB('orders');

    const newOrder = {
        id: uuidv4(),
        ...req.body,
        date: new Date()
    };

    orders.push(newOrder);
    writeDB('orders', orders);

    res.json(newOrder);
});

// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
