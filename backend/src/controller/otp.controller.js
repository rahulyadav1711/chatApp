import User from "../model/user.schema.js";
import OTP from "../model/Otp.js";
import nodemailer from "nodemailer";
import { generateOTP, hashOTP, verifyOTP, getOTPExpiry } from "../utils/otp.js";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const otpController = {};
otpController.sendOTP = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters",
      });
    }

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    await OTP.deleteMany({
      email: normalizedEmail,
    });
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const expiresAt = getOTPExpiry();
    await OTP.create({
      email: normalizedEmail,
      otp: hashedOTP,
      expiresAt,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: "Verify your ChatApp account",

      html: `
                <div style="font-family:sans-serif;padding:20px">

                    <h2>ChatApp Verification</h2>

                    <p>
                        Your verification code is
                    </p>

                    <h1
                        style="
                        letter-spacing:8px;
                        "
                    >
                        ${otp}
                    </h1>

                    <p>
                        This OTP expires in
                        ${process.env.OTP_EXPIRE_MINUTES}
                        minutes.
                    </p>

                </div>
            `,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

otpController.verifyOTP = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp?.trim();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }
    const otpDoc = await OTP.findOne({ email });

    if (otpDoc.verified) {
      return res.status(400).json({
        success: false,
        message: "OTP already verified",
      });
    }

    if (otpDoc.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpDoc._id });

      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    const isValid = verifyOTP(otp, otpDoc.otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    otpDoc.verified = true;

    await otpDoc.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

export default otpController;
