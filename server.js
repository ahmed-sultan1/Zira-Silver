const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

// ========== CLOUDINARY CONFIG ==========
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ========== MONGODB ==========
const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

let db;
async function connectDB() {
    await client.connect();
    db = client.db('zira');
    console.log('✅ MongoDB connected');
    await initializeDB();
}

const col = (name) => db.collection(name);

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'Public')));

// ========== MULTER CLOUDINARY ==========
const storage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'zira-silver', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ========== INITIALIZE DB ==========
async function initializeDB() {
    const products = await col('products').countDocuments();
    if (products === 0) {
        await col('products').insertMany([
            { id: 1, name: "Celestial Pendant", price: 3800, discount: 0, hasDiscount: false, images: ["images/WhatsApp Image 2026-05-08 at 3.00.11 PM.jpeg"], category: "necklaces", status: "active", createdAt: new Date().toISOString(), isNew: true, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["One Size"], description: "A stunning celestial pendant crafted from pure 925 silver." },
            { id: 2, name: "Silver Moon Ring", price: 2700, discount: 0, hasDiscount: false, images: ["images/WhatsApp Image 2026-05-08 at 3.00.12 PM (1).jpeg"], category: "rings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["5","6","7","8","9"], description: "Elegant moon phase ring." },
            { id: 3, name: "Dewdrop Earrings", price: 2050, discount: 0, hasDiscount: false, images: ["images/359817c2d48115c5d565fb4218435947.jpg"], category: "earrings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }, { code: "#FFD700", name: "Gold" }], availableColors: ["Silver","Gold"], availableSizes: ["One Size"], description: "Delicate dewdrop earrings." },
            { id: 4, name: "Infinity Necklace", price: 4750, discount: 15, hasDiscount: true, images: ["images/WhatsApp Image 2026-05-08 at 3.00.11 PM (2).jpeg"], category: "necklaces", status: "active", createdAt: new Date().toISOString(), isNew: true, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["One Size"], description: "Elegant infinity symbol necklace." },
            { id: 5, name: "Minimalist Band", price: 6300, discount: 0, hasDiscount: false, images: ["images/9e6213880b7f72b01b84e945ca5d2fad.jpg"], category: "rings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["6","7","8"], description: "Simple yet elegant silver band." },
            { id: 6, name: "Teardrop Earrings", price: 3500, discount: 10, hasDiscount: true, images: ["images/483578ca60b6bcc80f47249114445a26.jpg"], category: "earrings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["One Size"], description: "Graceful teardrop design." }
        ]);
    }

    const settings = await col('settings').countDocuments();
    if (settings === 0) {
        await col('settings').insertOne({ defaultShippingPrice: 100, freeShippingThreshold: 10000, storeName: "ZIRA", adminEmail: "admin@zira.com" });
    }

    const payment = await col('payment').countDocuments();
    if (payment === 0) {
        await col('payment').insertOne({ visa: true, wallet: true, cod: true });
    }

    const footer = await col('footer').countDocuments();
    if (footer === 0) {
        await col('footer').insertOne({ phone: "+201060200506", email: "hello@zira.com", instagram: "", facebook: "", tiktok: "", whatsapp: "" });
    }

    const policy = await col('policy').countDocuments();
    if (policy === 0) {
        await col('policy').insertOne({ companyName: "", commercialRegistry: "", returnPolicy: "", returnsContent: "" });
    }

    const shipping = await col('shipping').countDocuments();
    if (shipping === 0) {
        await col('shipping').insertOne({ "كفر الشيخ":110, "بيال":110, "الحامول":110, "الرياض":110, "بلطيم":110, "دمنهور":110 });
    }

    const admin = await col('admin').countDocuments();
    if (admin === 0) {
        const hashedPassword = bcrypt.hashSync('Zira2026', 10);
        await col('admin').insertOne({ username: 'admin', password: hashedPassword });
    }
}

// ========== HTML ROUTES ==========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'Public', 'admin.html')));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ========== AUTH ==========
app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    const admin = await col('admin').findOne({});
    if (admin && bcrypt.compareSync(password, admin.password)) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Invalid password" });
    }
});

app.post('/api/admin/change-password', async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await col('admin').updateOne({}, { $set: { password: hashedPassword } });
    res.json({ success: true });
});

// ========== PRODUCTS ==========
app.get('/api/products', async (req, res) => {
    const products = await col('products').find({}).toArray();
    res.json(products);
});

app.get('/api/products/:id', async (req, res) => {
    const product = await col('products').findOne({ id: parseInt(req.params.id) });
    if (product) res.json(product);
    else res.status(404).json({ error: "Product not found" });
});

app.post('/api/products', upload.array('images', 10), async (req, res) => {
    try {
        const { name, price, discount, hasDiscount, category, description, isNew, colors, sizes } = req.body;
        const imageUrls = req.files ? req.files.map(f => f.path) : [];
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
        await col('products').insertOne(newProduct);
        res.json({ success: true, product: newProduct });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { _id, ...update } = req.body;
    await col('products').updateOne({ id: parseInt(req.params.id) }, { $set: update });
    const product = await col('products').findOne({ id: parseInt(req.params.id) });
    res.json({ success: true, product });
});

app.delete('/api/products/:id', async (req, res) => {
    await col('products').deleteOne({ id: parseInt(req.params.id) });
    res.json({ success: true });
});

// ========== ORDERS ==========
app.get('/api/orders', async (req, res) => {
    const orders = await col('orders').find({}).toArray();
    res.json(orders);
});

app.get('/api/orders/completed', async (req, res) => {
    const completed = await col('completed').find({}).toArray();
    res.json(completed);
});

app.post('/api/orders', async (req, res) => {
    try {
        let { orderId, name, email, phone, address, city, postcode, paymentMethod, items, subtotal, shipping, total } = req.body;
        if (!name || !phone || !address || !city) return res.status(400).json({ success: false, message: 'Missing required fields' });
        if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'Order must include items' });

        if (!orderId) {
            const allOrders = await col('orders').find({}).toArray();
            const allCompleted = await col('completed').find({}).toArray();
            let maxNum = 0;
            [...allOrders, ...allCompleted].forEach(o => {
                if (o.orderId && o.orderId.startsWith('ZIRA-')) {
                    let num = parseInt(o.orderId.replace('ZIRA-', ''));
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            });
            orderId = 'ZIRA-' + String(maxNum + 1).padStart(4, '0');
        }

        const newOrder = { orderId, name, email: email || '', phone, address, city, postcode: postcode || '', date: new Date().toLocaleString(), paymentMethod: paymentMethod || 'cod', items, subtotal: Number(subtotal) || 0, shipping: Number(shipping) || 0, total: Number(total) || 0, status: 'pending' };
        await col('orders').insertOne(newOrder);
        res.json({ success: true, order: newOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/orders/complete/:orderId', async (req, res) => {
    const order = await col('orders').findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    order.status = 'completed';
    await col('completed').insertOne(order);
    await col('orders').deleteOne({ orderId: req.params.orderId });
    res.json({ success: true });
});

// ========== SHIPPING ==========
app.get('/api/shipping', async (req, res) => {
    const doc = await col('shipping').findOne({});
    const { _id, ...data } = doc || {};
    res.json(data);
});

app.post('/api/shipping', async (req, res) => {
    const { city, price } = req.body;
    await col('shipping').updateOne({}, { $set: { [city]: price } }, { upsert: true });
    res.json({ success: true });
});

app.delete('/api/shipping/:city', async (req, res) => {
    await col('shipping').updateOne({}, { $unset: { [decodeURIComponent(req.params.city)]: "" } });
    res.json({ success: true });
});

// ========== CATEGORIES ==========
app.get('/api/categories', async (req, res) => {
    const categories = await col('categories').find({}).toArray();
    res.json(categories);
});

app.post('/api/categories', async (req, res) => {
    const { name, value } = req.body;
    const newCategory = { id: Date.now().toString(), name, value };
    await col('categories').insertOne(newCategory);
    res.json({ success: true, category: newCategory });
});

app.delete('/api/categories/:id', async (req, res) => {
    await col('categories').deleteOne({ id: req.params.id });
    res.json({ success: true });
});

// ========== SETTINGS ==========
app.get('/api/settings', async (req, res) => {
    const doc = await col('settings').findOne({});
    const { _id, ...data } = doc || {};
    res.json(data);
});

app.put('/api/settings', async (req, res) => {
    const { _id, ...update } = req.body;
    await col('settings').updateOne({}, { $set: update }, { upsert: true });
    const doc = await col('settings').findOne({});
    const { _id: id, ...data } = doc;
    res.json({ success: true, settings: data });
});

// ========== PAYMENT ==========
app.get('/api/payment', async (req, res) => {
    const doc = await col('payment').findOne({});
    const { _id, ...data } = doc || {};
    res.json(data);
});

app.put('/api/payment', async (req, res) => {
    const { _id, ...update } = req.body;
    await col('payment').updateOne({}, { $set: update }, { upsert: true });
    res.json({ success: true });
});

// ========== FOOTER ==========
app.get('/api/footer', async (req, res) => {
    const doc = await col('footer').findOne({});
    const { _id, ...data } = doc || {};
    res.json(data);
});

app.put('/api/footer', async (req, res) => {
    const { _id, ...update } = req.body;
    await col('footer').updateOne({}, { $set: update }, { upsert: true });
    res.json({ success: true });
});

// ========== POLICY ==========
app.get('/api/policy', async (req, res) => {
    const doc = await col('policy').findOne({});
    const { _id, ...data } = doc || {};
    res.json(data);
});

app.put('/api/policy', async (req, res) => {
    const { _id, ...update } = req.body;
    await col('policy').updateOne({}, { $set: update }, { upsert: true });
    res.json({ success: true });
});

// ========== STATS ==========
app.get('/api/stats', async (req, res) => {
    const orders = await col('orders').find({}).toArray();
    const completed = await col('completed').find({}).toArray();
    const allOrders = [...orders, ...completed];
    res.json({
        totalSales: allOrders.length,
        totalOrders: orders.length,
        completedOrders: completed.length,
        totalRevenue: allOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    });
});

// ========== START ==========
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 ZIRA Server running on port ${PORT}`);
    });
}).catch(console.error);
