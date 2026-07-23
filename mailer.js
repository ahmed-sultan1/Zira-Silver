const nodemailer = require('nodemailer');

// ══════════════════════════════════════════════════════════════
//  ⚠️  الإيميلات دي بتتحط من الـ Environment Variables في Vercel
//  مش هنا في الكود — عشان الأمان
// ══════════════════════════════════════════════════════════════

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || EMAIL_USER;
const SITE_URL = process.env.SITE_URL || 'https://zira-silver.vercel.app';

let transporter = null;
if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });
} else {
    console.warn('⚠️  EMAIL_USER / EMAIL_PASS مش متظبطين — إرسال إشعارات الأوردر متعطل.');
}

function resolveImageUrl(img) {
    if (!img) return `${SITE_URL}/images/fc964e2fc36a1f5d0a0094b382fe7088.jpg`;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    if (img.startsWith('/')) return `${SITE_URL}${img}`;
    return `${SITE_URL}/${img}`;
}

async function sendOrderNotification(order) {
    if (!transporter) return;

    const itemsHtml = (order.items || []).map(item => `
        <tr>
            <td style="padding:12px 8px; border-bottom:1px solid #eee; width:70px;">
                <img src="${resolveImageUrl(item.image)}" width="60" height="60"
                     style="border-radius:8px; object-fit:cover; display:block; border:1px solid #eee;">
            </td>
            <td style="padding:12px 8px; border-bottom:1px solid #eee;">
                <div style="color:#1a1a1a; font-weight:600; font-size:14px;">${item.name || ''}</div>
                <div style="color:#999; font-size:12px; margin-top:2px;">
                    ${item.color || ''}${item.size ? ' / ' + item.size : ''}
                </div>
            </td>
            <td style="padding:12px 8px; border-bottom:1px solid #eee; text-align:right; color:#1a1a1a; font-size:14px; white-space:nowrap;">
                EGP ${Number(item.price || 0).toLocaleString()}
            </td>
        </tr>
    `).join('');

    const rowsInfo = [
        ['Order ID', order.orderId],
        ['Date', order.date],
        ['Customer Name', order.name],
        ['Phone', order.phone],
        ['Email', order.email || '—'],
        ['Address', `${order.address || ''}, ${order.city || ''}`],
        ['Payment Method', (order.paymentMethod || '').toUpperCase()]
    ].map(([label, value]) => `
        <tr>
            <td style="padding:6px 0; color:#888; font-size:13px;">${label}</td>
            <td style="padding:6px 0; text-align:right; color:#1a1a1a; font-size:13px; font-weight:600;">${value}</td>
        </tr>
    `).join('');

    const html = `
    <div style="font-family:Arial, sans-serif; max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #eee; border-radius:14px; overflow:hidden;">
        <div style="background:#1a1a1a; padding:24px 30px;">
            <h1 style="color:#f8f6f2; font-size:20px; letter-spacing:2px; margin:0;">ZIRA — New Order Received</h1>
        </div>
        <div style="padding:28px 30px;">
            <table style="width:100%; border-collapse:collapse; margin-bottom:22px;">
                ${rowsInfo}
            </table>
            <table style="width:100%; border-collapse:collapse;">
                ${itemsHtml}
            </table>
            <table style="width:100%; border-collapse:collapse; margin-top:18px;">
                <tr>
                    <td style="padding:5px 0; color:#888; font-size:13px;">Subtotal</td>
                    <td style="padding:5px 0; text-align:right; color:#1a1a1a; font-size:13px;">EGP ${Number(order.subtotal || 0).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding:5px 0; color:#888; font-size:13px;">Shipping</td>
                    <td style="padding:5px 0; text-align:right; color:#1a1a1a; font-size:13px;">EGP ${Number(order.shipping || 0).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding:12px 0 0; font-weight:700; font-size:16px; color:#1a1a1a; border-top:1px solid #eee;">TOTAL</td>
                    <td style="padding:12px 0 0; text-align:right; font-weight:700; font-size:16px; color:#1a1a1a; border-top:1px solid #eee;">EGP ${Number(order.total || 0).toLocaleString()}</td>
                </tr>
            </table>
        </div>
    </div>`;

    await transporter.sendMail({
        from: `"ZIRA Orders" <${EMAIL_USER}>`,
        to: ADMIN_EMAIL,
        subject: `🔔 New Order ${order.orderId} — ${order.name}`,
        html
    });
}

module.exports = { sendOrderNotification };