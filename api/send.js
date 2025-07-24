// api/send.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { name, email, message } = req.body;

  // Validate required fields
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // ✅ Create transporter using env variables
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,   // e.g., your@gmail.com
      pass: process.env.EMAIL_PASS    // App Password from Gmail
    }
  });

  try {
    // ✅ 1. Send email to YOU (the site owner)
    await transporter.sendMail({
      from: email,
      to: process.env.EMAIL_USER,
      subject: `New Contact Message from ${name}`,
      text: `
        Name: ${name}
        Email: ${email}
        
        Message:
        ${message}
      `
    });

    // ✅ 2. Auto-reply to the user
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thanks for contacting us!',
      text: `Hi ${name},\n\nThank you for reaching out! We’ve received your message and will respond shortly.\n\n— Nixate Studio`
    });

    return res.status(200).json({ success: true, message: 'Message sent and auto-reply sent.' });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Something went wrong while sending your message.' });
  }
}
