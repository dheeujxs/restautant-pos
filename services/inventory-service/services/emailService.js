import nodemailer from 'nodemailer';

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generate order email HTML
const generateOrderEmailHTML = (order, type = 'confirmation') => {
  const isConfirmation = type === 'confirmation';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${isConfirmation ? 'Order Confirmation' : 'Order Status Update'}</title>
      <style>
        body { font-family: 'DM Sans', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f97316, #ef4444); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .order-details { background: #f8f7f4; border-radius: 12px; padding: 15px; margin-bottom: 20px; }
        .order-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
        .order-item:last-child { border-bottom: none; }
        .total { font-size: 18px; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 2px solid #f97316; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #f97316; color: white; }
        .footer { background: #f8f7f4; padding: 20px; text-align: center; font-size: 12px; color: #999; }
        .btn { display: inline-block; padding: 10px 20px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🍽️ ${isConfirmation ? 'Order Confirmed!' : 'Order Status Updated'}</h1>
          <p>Order #${order.orderNumber}</p>
        </div>
        <div class="content">
          <div class="order-details">
            <p><strong>Order Type:</strong> ${order.orderType?.toUpperCase()}</p>
            ${order.tableNumber ? `<p><strong>Table:</strong> ${order.tableNumber}</p>` : ''}
            ${order.customerName ? `<p><strong>Customer:</strong> ${order.customerName}</p>` : ''}
            <p><strong>Status:</strong> <span class="status-badge">${order.orderStatus?.toUpperCase()}</span></p>
          </div>
          
          <h3>Order Items</h3>
          ${order.items.map(item => `
            <div class="order-item">
              <span>${item.quantity} × ${item.productName}</span>
              <span>₹${item.totalPrice}</span>
            </div>
          `).join('')}
          
          <div class="total">
            <div style="display: flex; justify-content: space-between;">
              <span>Total Amount:</span>
              <span style="color: #f97316;">₹${order.total}</span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/orders/${order._id}" class="btn">Track Your Order</a>
          </div>
        </div>
        <div class="footer">
          <p>Thank you for choosing us! 🍕</p>
          <p>For any queries, contact us at support@restaurant.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send email function
export const sendOrderEmail = async (order, customerEmail, type = 'confirmation') => {
  if (!customerEmail || customerEmail === '') {
    console.log('No customer email provided, skipping email');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Restaurant" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: type === 'confirmation' ? `Order Confirmation #${order.orderNumber}` : `Order Status Update #${order.orderNumber}`,
      html: generateOrderEmailHTML(order, type),
    });
    
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

export default { sendOrderEmail };