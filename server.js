const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const app = express();

// ========== MONGODB SETUP ==========
const MONGO_URI = process.env.MONGO_URI;
let db;

async function connectDB() {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db('zira-silver');
        console.log('✅ Connected to MongoDB Atlas');
        await initializeDB();
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
}

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========== STATIC FILES ==========
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/images', express.static(path.join(__dirname, 'Public', 'images')));

const UPLOAD_DIRS = [
    path.join(__dirname, 'Public', 'images', 'uploads'),
    path.join(__dirname, 'uploads')
];
UPLOAD_DIRS.forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use('/uploads', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const rel = decodeURIComponent(req.path.replace(/^\//, ''));
    if (!rel || rel.includes('..')) return next();
    for (const dir of UPLOAD_DIRS) {
        const filePath = path.join(dir, rel);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return res.sendFile(filePath);
        }
    }
    next();
});

// ========== MULTER SETUP FOR IMAGES ==========
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIRS[0]);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ========== DB HELPERS ==========
const getCol = (name) => db.collection(name);

const readDB = async (name) => {
    const col = getCol(name);
    if (name === 'settings' || name === 'payment' || name === 'footer' || name === 'policy' || name === 'shipping') {
        const doc = await col.findOne({ _id: 'singleton' });
        if (!doc) return {};
        const { _id, ...rest } = doc;
        return rest;
    }
    if (name === 'admin') {
        return await col.find({}).toArray();
    }
    return await col.find({}).sort({ createdAt: -1 }).toArray();
};

const writeDB = async (name, data) => {
    const col = getCol(name);
    if (name === 'settings' || name === 'payment' || name === 'footer' || name === 'policy' || name === 'shipping') {
        await col.replaceOne({ _id: 'singleton' }, { _id: 'singleton', ...data }, { upsert: true });
    } else if (name === 'admin') {
        await col.deleteMany({});
        if (Array.isArray(data) && data.length > 0) await col.insertMany(data);
    } else {
        await col.deleteMany({});
        if (Array.isArray(data) && data.length > 0) await col.insertMany(data);
    }
};

// ========== INITIALIZE DATABASE ==========
const initializeDB = async () => {
    // Products
    const productsCount = await getCol('products').countDocuments();
    if (productsCount === 0) {
        await getCol('products').insertMany([
            { id: 1, name: "Celestial Pendant", price: 3800, discount: 0, hasDiscount: false, images: ["images/WhatsApp Image 2026-05-08 at 3.00.11 PM.jpeg"], category: "necklaces", status: "active", createdAt: new Date().toISOString(), isNew: true, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["One Size"], description: "A stunning celestial pendant crafted from pure 925 silver." },
            { id: 2, name: "Silver Moon Ring", price: 2700, discount: 0, hasDiscount: false, images: ["images/WhatsApp Image 2026-05-08 at 3.00.12 PM (1).jpeg"], category: "rings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["5","6","7","8","9"], description: "Elegant moon phase ring." },
            { id: 3, name: "Dewdrop Earrings", price: 2050, discount: 0, hasDiscount: false, images: ["images/359817c2d48115c5d565fb4218435947.jpg"], category: "earrings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }, { code: "#FFD700", name: "Gold" }], availableColors: ["Silver","Gold"], availableSizes: ["One Size"], description: "Delicate dewdrop earrings." },
            { id: 4, name: "Infinity Necklace", price: 4750, discount: 15, hasDiscount: true, images: ["images/WhatsApp Image 2026-05-08 at 3.00.11 PM (2).jpeg"], category: "necklaces", status: "active", createdAt: new Date().toISOString(), isNew: true, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["One Size"], description: "Elegant infinity symbol necklace." },
            { id: 5, name: "Minimalist Band", price: 6300, discount: 0, hasDiscount: false, images: ["images/9e6213880b7f72b01b84e945ca5d2fad.jpg"], category: "rings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["6","7","8"], description: "Simple yet elegant silver band." },
            { id: 6, name: "Teardrop Earrings", price: 3500, discount: 10, hasDiscount: true, images: ["images/483578ca60b6bcc80f47249114445a26.jpg"], category: "earrings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["One Size"], description: "Graceful teardrop design." }
        ]);
    }

    const shippingDoc = await getCol('shipping').findOne({ _id: 'singleton' });
    if (!shippingDoc) {
        await getCol('shipping').insertOne({ _id: 'singleton', "كفر الشيخ":110, "بيال":110, "الحامول":110, "الرياض":110, "بلطيم":110, "دمنهور":110 });
    }

    const settingsDoc = await getCol('settings').findOne({ _id: 'singleton' });
    if (!settingsDoc) {
        await getCol('settings').insertOne({ _id: 'singleton', defaultShippingPrice: 100, freeShippingThreshold: 10000, storeName: "ZIRA", adminEmail: "admin@zira.com" });
    }

    const paymentDoc = await getCol('payment').findOne({ _id: 'singleton' });
    if (!paymentDoc) {
        await getCol('payment').insertOne({ _id: 'singleton', visa: true, wallet: true, cod: true });
    }

    const footerDoc = await getCol('footer').findOne({ _id: 'singleton' });
    if (!footerDoc) {
        await getCol('footer').insertOne({ _id: 'singleton', phone: "+201060200506", email: "hello@zira.com", instagram: "", facebook: "", tiktok: "", whatsapp: "" });
    }

    const policyDoc = await getCol('policy').findOne({ _id: 'singleton' });
    if (!policyDoc) {
        await getCol('policy').insertOne({ _id: 'singleton', companyName: "", commercialRegistry: "", returnPolicy: "", returnsContent: "" });
    }

    const adminCount = await getCol('admin').countDocuments();
    if (adminCount === 0) {
        const hashedPassword = bcrypt.hashSync('Zira2026', 10);
        await getCol('admin').insertOne({ username: 'admin', password: hashedPassword });
    }

    console.log('✅ Database initialized');
};

// ========== HTML ROUTES ==========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'admin.html')));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ========== AUTH API ==========
app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    const admins = await getCol('admin').find({}).toArray();
    if (admins.length > 0 && bcrypt.compareSync(password, admins[0].password)) {
        res.json({ success: true, message: "Login successful" });
    } else {
        res.status(401).json({ success: false, message: "Invalid password" });
    }
});

app.post('/api/admin/change-password', async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await getCol('admin').deleteMany({});
    await getCol('admin').insertOne({ username: 'admin', password: hashedPassword });
    res.json({ success: true, message: "Password changed successfully" });
});

// ========== PRODUCTS API ==========
app.get('/api/products', async (req, res) => {
    const products = await getCol('products').find({}).sort({ createdAt: -1 }).toArray();
    res.json(products);
});

app.get('/api/products/:id', async (req, res) => {
    const products = await getCol('products').find({}).toArray();
    const product = products.find(p => String(p.id) === String(req.params.id));
    if (product) res.json(product);
    else res.status(404).json({ error: "Product not found" });
});

app.post('/api/products', upload.array('images', 10), async (req, res) => {
    try {
        const { name, price, discount, hasDiscount, category, description, isNew, colors, sizes } = req.body;
        const imageUrls = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
        const newProduct = {
            id: Date.now(),
            name,
            price: parseFloat(price),
            discount: parseInt(discount) || 0,
            hasDiscount: hasDiscount === 'true',
            category,
            images: imageUrls,
            status: 'active',
            createdAt: new Date().toISOString(),
            isNew: isNew === 'true',
            colors: colors ? JSON.parse(colors) : [{ code: "#C0C0C0", name: "Silver" }],
            availableColors: colors ? JSON.parse(colors).map(c => c.name) : ["Silver"],
            availableSizes: sizes ? sizes.split(',').map(s => s.trim()) : ["One Size"],
            description: description || ""
        };
        await getCol('products').insertOne(newProduct);
        res.json({ success: true, product: newProduct });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const products = await getCol('products').find({}).toArray();
    const product = products.find(p => String(p.id) === String(req.params.id));
    if (!product) return res.status(404).json({ error: "Product not found" });
    const updated = { ...product, ...req.body };
    await getCol('products').replaceOne({ id: product.id }, updated);
    res.json({ success: true, product: updated });
});

app.delete('/api/products/:id', async (req, res) => {
    await getCol('products').deleteOne({ id: parseInt(req.params.id) });
    res.json({ success: true });
});

// ========== ORDERS API ==========
app.get('/api/orders', async (req, res) => {
    const orders = await getCol('orders').find({}).sort({ _id: -1 }).toArray();
    res.json(orders);
});

app.get('/api/orders/completed', async (req, res) => {
    const completed = await getCol('completed').find({}).sort({ _id: -1 }).toArray();
    res.json(completed);
});

app.post('/api/orders', async (req, res) => {
    try {
        let { orderId, name, email, phone, address, city, postcode, paymentMethod, items, subtotal, shipping, total } = req.body;
        if (!name || !phone || !address || !city) return res.status(400).json({ success: false, message: 'Missing required shipping fields' });
        if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'Order must include at least one item' });

        if (!orderId) {
            const allOrders = await getCol('orders').find({}).toArray();
            const allCompleted = await getCol('completed').find({}).toArray();
            const all = [...allOrders, ...allCompleted];
            let maxNum = 0;
            all.forEach(o => {
                if (o.orderId && o.orderId.startsWith('ZIRA-')) {
                    let num = parseInt(o.orderId.replace('ZIRA-', ''));
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            });
            orderId = 'ZIRA-' + String(maxNum + 1).padStart(4, '0');
        }

        const newOrder = {
            orderId, name, email: email || '', phone, address, city,
            postcode: postcode || '',
            date: new Date().toLocaleString(),
            paymentMethod: paymentMethod || 'cod',
            items, subtotal: Number(subtotal) || 0,
            shipping: Number(shipping) || 0,
            total: Number(total) || 0,
            status: 'pending'
        };
        await getCol('orders').insertOne(newOrder);
        res.json({ success: true, order: newOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/orders/complete/:orderId', async (req, res) => {
    const order = await getCol('orders').findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    order.status = 'completed';
    await getCol('completed').insertOne(order);
    await getCol('orders').deleteOne({ orderId: req.params.orderId });
    res.json({ success: true });
});

// ========== SHIPPING API ==========
app.get('/api/shipping', async (req, res) => {
    const doc = await getCol('shipping').findOne({ _id: 'singleton' });
    if (!doc) return res.json({});
    const { _id, ...rest } = doc;
    res.json(rest);
});

app.post('/api/shipping', async (req, res) => {
    const { city, price } = req.body;
    await getCol('shipping').updateOne({ _id: 'singleton' }, { $set: { [city]: price } }, { upsert: true });
    res.json({ success: true });
});

app.delete('/api/shipping/:city', async (req, res) => {
    const city = decodeURIComponent(req.params.city);
    await getCol('shipping').updateOne({ _id: 'singleton' }, { $unset: { [city]: "" } });
    res.json({ success: true });
});

// ========== CATEGORIES API ==========
app.get('/api/categories', async (req, res) => {
    const categories = await getCol('categories').find({}).toArray();
    res.json(categories);
});

app.post('/api/categories', async (req, res) => {
    const { name, value } = req.body;
    const newCategory = { id: Date.now().toString(), name, value };
    await getCol('categories').insertOne(newCategory);
    res.json({ success: true, category: newCategory });
});

app.delete('/api/categories/:id', async (req, res) => {
    await getCol('categories').deleteOne({ id: req.params.id });
    res.json({ success: true });
});

// ========== SETTINGS API ==========
app.get('/api/settings', async (req, res) => {
    const doc = await getCol('settings').findOne({ _id: 'singleton' });
    if (!doc) return res.json({});
    const { _id, ...rest } = doc;
    res.json(rest);
});

app.put('/api/settings', async (req, res) => {
    await getCol('settings').updateOne({ _id: 'singleton' }, { $set: req.body }, { upsert: true });
    const doc = await getCol('settings').findOne({ _id: 'singleton' });
    const { _id, ...rest } = doc;
    res.json({ success: true, settings: rest });
});

// ========== PAYMENT API ==========
app.get('/api/payment', async (req, res) => {
    const doc = await getCol('payment').findOne({ _id: 'singleton' });
    if (!doc) return res.json({});
    const { _id, ...rest } = doc;
    res.json(rest);
});

app.put('/api/payment', async (req, res) => {
    await getCol('payment').updateOne({ _id: 'singleton' }, { $set: req.body }, { upsert: true });
    const doc = await getCol('payment').findOne({ _id: 'singleton' });
    const { _id, ...rest } = doc;
    res.json({ success: true, payment: rest });
});

// ========== FOOTER API ==========
app.get('/api/footer', async (req, res) => {
    const doc = await getCol('footer').findOne({ _id: 'singleton' });
    if (!doc) return res.json({});
    const { _id, ...rest } = doc;
    res.json(rest);
});

app.put('/api/footer', async (req, res) => {
    await getCol('footer').updateOne({ _id: 'singleton' }, { $set: req.body }, { upsert: true });
    const doc = await getCol('footer').findOne({ _id: 'singleton' });
    const { _id, ...rest } = doc;
    res.json({ success: true, footer: rest });
});

// ========== POLICY API ==========
app.get('/api/policy', async (req, res) => {
    const doc = await getCol('policy').findOne({ _id: 'singleton' });
    if (!doc) return res.json({});
    const { _id, ...rest } = doc;
    res.json(rest);
});

app.put('/api/policy', async (req, res) => {
    await getCol('policy').updateOne({ _id: 'singleton' }, { $set: req.body }, { upsert: true });
    const doc = await getCol('policy').findOne({ _id: 'singleton' });
    const { _id, ...rest } = doc;
    res.json({ success: true, policy: rest });
});

// ========== STATS API ==========
app.get('/api/stats', async (req, res) => {
    const orders = await getCol('orders').find({}).toArray();
    const completed = await getCol('completed').find({}).toArray();
    const allOrders = [...orders, ...completed];
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    res.json({
        totalSales: allOrders.length,
        totalOrders: orders.length,
        completedOrders: completed.length,
        totalRevenue
    });
});

// ========== START ==========
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

connectDB().then(() => {
    app.listen(PORT, HOST, () => {
        console.log(`🚀 ZIRA Server running on port ${PORT}`);
        console.log(`📱 Frontend: http://localhost:${PORT}`);
        console.log(`🔒 Admin Panel: http://localhost:${PORT}/admin`);
    });
});
