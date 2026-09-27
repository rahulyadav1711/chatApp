import userModule from "../model/user.schema.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import cloudinary from "../config/cloudinary.js";
import OTP from "../model/Otp.js";
import resend from "../config/resend.js";
import { welcomeEmailTemplate } from "../utils/emailTemplates.js";

const generateToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};
const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({
        message: "Username must be at least 3 characters",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    const existingUser = await userModule.findOne({
      email,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }
    const otpDoc = await OTP.findOne({
      email,
    });

    if (!otpDoc || !otpDoc.verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userModule.create({
      username,
      email,
      password: hashedPassword,
    });

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "🎉 Welcome to ChatApp!",
        html: welcomeEmailTemplate(username),
      });
    } catch (error) {
      console.error("Welcome Email Error:", error);
    }

    await OTP.deleteOne({ email });
    const token = generateToken(newUser._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModule.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const getCurrentUser = async (req, res) => {
  try {
    const user = await userModule.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const updateProfile = async (req, res) => {
  try {
    const user = await userModule.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const { username, about } = req.body;
    if (username?.trim()) {
      user.username = username.trim();
    }
    if (about !== undefined) {
      user.about = about.trim();
    }
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "ChatApp/Profile",
        resource_type: "image",
      });
      user.avatar = result.secure_url;

      fs.unlink(req.file.path, (error) => {
        if (error) {
          console.error("Failed to remove temporary file:", error);
        }
      });
    }
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Profile updated",
      user,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
export default {
  signup,
  login,
  logout,
  getCurrentUser,
  updateProfile,
};
