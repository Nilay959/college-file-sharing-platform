const nodemailer = require('nodemailer');

// Setup transporter
// If SMTP_USER and SMTP_PASS are provided in .env, it uses them (e.g. Gmail).
// Otherwise, it creates a mock test account on the fly (Ethereal) which prints a preview link.
const createTransporter = async () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: 'gmail', // Standard fallback, can configure specifically if needed
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Development mock email
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
};

const sendOtpEmail = async (toEmail, otp) => {
  try {
    const transporter = await createTransporter();
    
    const info = await transporter.sendMail({
      from: '"College File Sharing" <noreply@collegefiles.local>',
      to: toEmail,
      subject: "Your Registration OTP",
      text: `Your OTP for registration is: ${otp}. It will expire in 10 minutes.`,
      html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>College File Sharing Verification</h2>
        <p>Your one-time password (OTP) for registration is:</p>
        <h1 style="background: #f4f4f5; padding: 10px; border-radius: 5px; text-align: center; letter-spacing: 5px; color: #4f46e5;">${otp}</h1>
        <p>This code will expire in 10 minutes. Do not share it with anyone.</p>
      </div>`
    });

    if (!process.env.SMTP_USER) {
      console.log("\n=======================================================\n");
      console.log(" MOCK EMAIL SENT!\n");
      console.log(" --> YOUR REGISTRATION OTP IS: " + otp + " <--\n");
      console.log(" (View full email here: %s)", nodemailer.getTestMessageUrl(info));
      console.log("\n=======================================================\n");
    }
    
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

module.exports = { sendOtpEmail };
