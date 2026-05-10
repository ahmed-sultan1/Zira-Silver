const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const app = express();

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========== STATIC FILES ==========
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/images', express.static(path.join(__dirname, 'Public', 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== MULTER SETUP FOR IMAGES ==========
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ========== helper functions ==========
const readDB = (file) => {
    try {
        const dbPath = path.join(__dirname, 'database', `${file}.json`);
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify([]));
            return [];
        }
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        return [];
    }
};

const writeDB = (file, data) => {
    const dbPath = path.join(__dirname, 'database', `${file}.json`);
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// ========== INITIALIZE DATABASE ==========
const initializeDB = () => {
    // Products
    let products = readDB('products');
    if (products.length === 0) {
        products = [
            { id: 1, name: "Celestial Pendant", price: 3800, discount: 0, hasDiscount: false, images: ["images/WhatsApp Image 2026-05-08 at 3.00.11 PM.jpeg"], category: "necklaces", status: "active", createdAt: new Date().toISOString(), isNew: true, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["One Size"], description: "A stunning celestial pendant crafted from pure 925 silver." },
            { id: 2, name: "Silver Moon Ring", price: 2700, discount: 0, hasDiscount: false, images: ["images/WhatsApp Image 2026-05-08 at 3.00.12 PM (1).jpeg"], category: "rings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["5","6","7","8","9"], description: "Elegant moon phase ring." },
            { id: 3, name: "Dewdrop Earrings", price: 2050, discount: 0, hasDiscount: false, images: ["images/359817c2d48115c5d565fb4218435947.jpg"], category: "earrings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }, { code: "#FFD700", name: "Gold" }], availableColors: ["Silver","Gold"], availableSizes: ["One Size"], description: "Delicate dewdrop earrings." },
            { id: 4, name: "Infinity Necklace", price: 4750, discount: 15, hasDiscount: true, images: ["images/WhatsApp Image 2026-05-08 at 3.00.11 PM (2).jpeg"], category: "necklaces", status: "active", createdAt: new Date().toISOString(), isNew: true, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["One Size"], description: "Elegant infinity symbol necklace." },
            { id: 5, name: "Minimalist Band", price: 6300, discount: 0, hasDiscount: false, images: ["images/9e6213880b7f72b01b84e945ca5d2fad.jpg"], category: "rings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["6","7","8"], description: "Simple yet elegant silver band." },
            { id: 6, name: "Teardrop Earrings", price: 3500, discount: 10, hasDiscount: true, images: ["images/483578ca60b6bcc80f47249114445a26.jpg"], category: "earrings", status: "active", createdAt: new Date().toISOString(), isNew: false, colors: [{ code: "#C0C0C0", name: "Silver" }], availableColors: ["Silver"], availableSizes: ["One Size"], description: "Graceful teardrop design." }
        ];
        writeDB('products', products);
    }

    let orders = readDB('orders');
    if (orders.length === 0) writeDB('orders', []);

    let completed = readDB('completed');
    if (completed.length === 0) writeDB('completed', []);

    let shipping = readDB('shipping');
    if (shipping.length === 0) {
        shipping = { "كفر الشيخ":110, "بيال":110, "الحامول":110, "الرياض":110, "بلطيم":110, "دمنهور":110 };
        writeDB('shipping', shipping);
    }

    let categories = readDB('categories');
    if (categories.length === 0) writeDB('categories', []);

    let settings = readDB('settings');
    if (Object.keys(settings).length === 0) {
        settings = { defaultShippingPrice: 100, freeShippingThreshold: 10000, storeName: "ZIRA", adminEmail: "admin@zira.com" };
        writeDB('settings', settings);
    }

    let payment = readDB('payment');
    if (Object.keys(payment).length === 0) {
        payment = { visa: true, wallet: true, cod: true };
        writeDB('payment', payment);
    }

    let footer = readDB('footer');
    if (Object.keys(footer).length === 0) {
        footer = { phone: "+201060200506", email: "hello@zira.com", instagram: "", facebook: "", tiktok: "", whatsapp: "" };
        writeDB('footer', footer);
    }

    let policy = readDB('policy');
    if (Object.keys(policy).length === 0) {
        policy = { companyName: "", commercialRegistry: "", returnPolicy: "", returnsContent: "" };
        writeDB('policy', policy);
    }

    let admin = readDB('admin');
    if (admin.length === 0) {
        const hashedPassword = bcrypt.hashSync('Zira2026', 10);
        writeDB('admin', [{ username: 'admin', password: hashedPassword }]);
    }
};

initializeDB();

// ========== HTML ROUTES ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'admin.html'));
});

// ========== AUTH API ==========
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const admin = readDB('admin');
    if (admin.length > 0 && bcrypt.compareSync(password, admin[0].password)) {
        res.json({ success: true, message: "Login successful" });
    } else {
        res.status(401).json({ success: false, message: "Invalid password" });
    }
});

app.post('/api/admin/change-password', (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    writeDB('admin', [{ username: 'admin', password: hashedPassword }]);
    res.json({ success: true, message: "Password changed successfully" });
});

// ========== PRODUCTS API ==========
app.get('/api/products', (req, res) => {
    const products = readDB('products');
    res.json(products);
});

app.get('/api/products/:id', (req, res) => {
    const products = readDB('products');
    const product = products.find(p => p.id == req.params.id);
    if (product) res.json(product);
    else res.status(404).json({ error: "Product not found" });
});

app.post('/api/products', upload.array('images', 10), (req, res) => {
    try {
        const products = readDB('products');
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
        
        products.unshift(newProduct);
        writeDB('products', products);
        res.json({ success: true, product: newProduct });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/products/:id', (req, res) => {
    const products = readDB('products');
    const index = products.findIndex(p => p.id == req.params.id);
    if (index === -1) return res.status(404).json({ error: "Product not found" });
    
    products[index] = { ...products[index], ...req.body };
    writeDB('products', products);
    res.json({ success: true, product: products[index] });
});

app.delete('/api/products/:id', (req, res) => {
    const products = readDB('products');
    const filtered = products.filter(p => p.id != req.params.id);
    writeDB('products', filtered);
    res.json({ success: true });
});

// ========== ORDERS API ==========
app.get('/api/orders', (req, res) => {
    const orders = readDB('orders');
    res.json(orders);
});

app.get('/api/orders/completed', (req, res) => {
    const completed = readDB('completed');
    res.json(completed);
});

app.post('/api/orders', (req, res) => {
    const orders = readDB('orders');
    const completed = readDB('completed');
    let { orderId, name, email, phone, address, city, postcode, paymentMethod, items, subtotal, shipping, total } = req.body;
    
    // Generate unique order ID if not provided
    if (!orderId) {
        const allOrders = [...orders, ...completed];
        let maxNum = 0;
        allOrders.forEach(o => {
            if (o.orderId && o.orderId.startsWith('ZIRA-')) {
                let num = parseInt(o.orderId.replace('ZIRA-', ''));
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });
        orderId = 'ZIRA-' + String(maxNum + 1).padStart(4, '0');
    }
    
    const newOrder = {
        orderId,
        name,
        email: email || '',
        phone,
        address,
        city,
        postcode: postcode || '',
        date: new Date().toLocaleString(),
        paymentMethod,
        items,
        subtotal,
        shipping,
        total,
        status: 'pending'
    };
    
    orders.unshift(newOrder);
    writeDB('orders', orders);
    res.json({ success: true, order: newOrder });
});

app.put('/api/orders/complete/:orderId', (req, res) => {
    let orders = readDB('orders');
    let completed = readDB('completed');
    
    const orderIndex = orders.findIndex(o => o.orderId === req.params.orderId);
    if (orderIndex === -1) return res.status(404).json({ error: "Order not found" });
    
    const completedOrder = orders[orderIndex];
    completedOrder.status = 'completed';
    completed.unshift(completedOrder);
    orders = orders.filter(o => o.orderId !== req.params.orderId);
    
    writeDB('orders', orders);
    writeDB('completed', completed);
    res.json({ success: true });
});

// ========== SHIPPING API ==========
app.get('/api/shipping', (req, res) => {
    const shipping = readDB('shipping');
    res.json(shipping);
});

app.post('/api/shipping', (req, res) => {
    const shipping = readDB('shipping');
    const { city, price } = req.body;
    shipping[city] = price;
    writeDB('shipping', shipping);
    res.json({ success: true });
});

app.delete('/api/shipping/:city', (req, res) => {
    const shipping = readDB('shipping');
    delete shipping[decodeURIComponent(req.params.city)];
    writeDB('shipping', shipping);
    res.json({ success: true });
});

// ========== CATEGORIES API ==========
app.get('/api/categories', (req, res) => {
    const categories = readDB('categories');
    res.json(categories);
});

app.post('/api/categories', (req, res) => {
    const categories = readDB('categories');
    const { name, value } = req.body;
    const newCategory = { id: Date.now().toString(), name, value };
    categories.push(newCategory);
    writeDB('categories', categories);
    res.json({ success: true, category: newCategory });
});

app.delete('/api/categories/:id', (req, res) => {
    const categories = readDB('categories');
    const filtered = categories.filter(c => c.id !== req.params.id);
    writeDB('categories', filtered);
    res.json({ success: true });
});

// ========== SETTINGS API ==========
app.get('/api/settings', (req, res) => {
    const settings = readDB('settings');
    res.json(settings);
});

app.put('/api/settings', (req, res) => {
    const settings = readDB('settings');
    const updated = { ...settings, ...req.body };
    writeDB('settings', updated);
    res.json({ success: true, settings: updated });
});

// ========== PAYMENT API ==========
app.get('/api/payment', (req, res) => {
    const payment = readDB('payment');
    res.json(payment);
});

app.put('/api/payment', (req, res) => {
    const payment = readDB('payment');
    const updated = { ...payment, ...req.body };
    writeDB('payment', updated);
    res.json({ success: true, payment: updated });
});

// ========== FOOTER API ==========
app.get('/api/footer', (req, res) => {
    const footer = readDB('footer');
    res.json(footer);
});

app.put('/api/footer', (req, res) => {
    const footer = readDB('footer');
    const updated = { ...footer, ...req.body };
    writeDB('footer', updated);
    res.json({ success: true, footer: updated });
});

// ========== POLICY API ==========
app.get('/api/policy', (req, res) => {
    const policy = readDB('policy');
    res.json(policy);
});

app.put('/api/policy', (req, res) => {
    const policy = readDB('policy');
    const updated = { ...policy, ...req.body };
    writeDB('policy', updated);
    res.json({ success: true, policy: updated });
});

// ========== STATS API ==========
app.get('/api/stats', (req, res) => {
    const orders = readDB('orders');
    const completed = readDB('completed');
    const allOrders = [...orders, ...completed];
    const totalOrders = orders.length;
    const completedOrders = completed.length;
    const totalSales = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    res.json({ totalSales, totalOrders, completedOrders, totalRevenue });
});

// ========== SERVER START ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ZIRA Server running on http://localhost:${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔒 Admin Panel: http://localhost:${PORT}/admin`);
});