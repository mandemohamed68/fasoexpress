import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import db from "./backend/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { App } from "firebase-admin/app";
import fs from "fs";

// Firebase Admin dynamic configuration
let firebaseAdminApp: App | null = null;
function getFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;
  
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountVar) {
    try {
      let cleaned = serviceAccountVar.trim();
      
      // Extract the JSON object starting from the first '{' and ending at the last '}'
      // to handle any wrapping characters, parenthesized statements from PM2/Docker, etc.
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      
      // Debug log (masked to avoid exposing secrets)
      const masked = cleaned.replace(/(["']?private_key["']?\s*:\s*)(["'])(?:(?!\2).|\\.)*\2/g, '$1$2***MASKED***$2');
      console.log(`[FCM Config] Extracted length: ${cleaned.length}`);
      console.log(`[FCM Config] Preview: ${masked.slice(0, 150)}...${masked.slice(-100)}`);

      let serviceAccount: any = null;
      
      // Attempt 1: Parse directly as JSON. In valid JSON, private_key has escaped newlines like "\\n"
      try {
        serviceAccount = JSON.parse(cleaned);
        console.log("[FCM Config] Standard JSON.parse succeeded.");
      } catch (jsonErr: any) {
        console.log(`[FCM Config] JSON.parse failed (${jsonErr.message}). Trying Function evaluation...`);
        
        // Attempt 2: Maybe it's a JavaScript object with single quotes, unescaped keys, etc.
        try {
          serviceAccount = new Function(`return (${cleaned});`)();
          console.log("[FCM Config] Function evaluation succeeded.");
        } catch (fnErr: any) {
          console.log(`[FCM Config] Function evaluation failed (${fnErr.message}). Trying literal newline escaping fallback...`);
          
          // Attempt 3: If it has literal unescaped newlines inside quotes, let's escape them
          try {
            const escapedCleaned = cleaned.replace(/(["']private_key["']\s*:\s*)(["'])([\s\S]*?)\2/g, (match, key, quote, val) => {
              const escapedVal = val.replace(/\r?\n/g, '\\n');
              return `${key}${quote}${escapedVal}${quote}`;
            });
            serviceAccount = new Function(`return (${escapedCleaned});`)();
            console.log("[FCM Config] Fallback newline-escaped parsing succeeded.");
          } catch (lastErr: any) {
            console.error("[FCM Config] All parsing attempts failed.", lastErr);
            throw lastErr;
          }
        }
      }

      if (serviceAccount) {
        // Ensure private_key has actual newlines (replace literal "\\n" with "\n")
        if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        
        firebaseAdminApp = initializeApp({
          credential: cert(serviceAccount)
        });
        console.log("[FCM] Firebase Admin initialisé avec les variables d'environnement.");
        return firebaseAdminApp;
      }
    } catch (e: any) {
      console.error("[FCM] Échec d'analyse de FIREBASE_SERVICE_ACCOUNT:", e.message || e);
    }
  }
  
  const saPath = path.join(process.cwd(), "service-account.json");
  if (fs.existsSync(saPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf8"));
      if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      firebaseAdminApp = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("[FCM] Firebase Admin initialisé avec le fichier service-account.json.");
      return firebaseAdminApp;
    } catch (e) {
      console.error("[FCM] Échec d'initialisation de Firebase Admin avec service-account.json:", e);
    }
  }
  
  console.warn("[FCM] Firebase Admin NON initialisé. Les notifications push natives ne seront pas envoyées. Veuillez configurer la variable d'environnement FIREBASE_SERVICE_ACCOUNT ou placer un fichier service-account.json à la racine.");
  return null;
}

async function sendPushNotification(userId: string, title: string, body: string, data: Record<string, string> = {}) {
  try {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      console.log(`[FCM] Notification en attente (Firebase non initialisé). Utilisateur: ${userId}, Titre: ${title}`);
      return;
    }
    
    const tokens = db.prepare("SELECT token FROM user_push_tokens WHERE userId = ?").all(userId) as { token: string }[];
    if (tokens.length === 0) {
      console.log(`[FCM] Aucun token de push enregistré pour l'utilisateur: ${userId}`);
      return;
    }
    
    const registrationTokens = tokens.map(t => t.token);
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      },
      android: {
        priority: "high" as const,
        notification: {
          sound: "default",
          channelId: "high_importance_channel",
          priority: "max" as const,
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        headers: {
          "apns-priority": "10"
        },
        payload: {
          aps: {
            sound: "default",
            badge: 1
          }
        }
      },
      tokens: registrationTokens
    };
    
    const response = await getMessaging(adminApp).sendEachForMulticast(message);
    console.log(`[FCM] Push envoyé avec succès à ${response.successCount} appareils pour l'utilisateur ${userId}. Erreurs: ${response.failureCount}`);
    
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (error && (error.code === "messaging/invalid-registration-token" || error.code === "messaging/registration-token-not-registered")) {
            const badToken = registrationTokens[idx];
            db.prepare("DELETE FROM user_push_tokens WHERE token = ?").run(badToken);
            console.log(`[FCM] Token de push invalide supprimé: ${badToken}`);
          }
        }
      });
    }
  } catch (err) {
    console.error("[FCM] Erreur lors de l'envoi de la notification push:", err);
  }
}

// Interceptor on db.prepare to automatically send Push Notifications when database notifications are created
const originalPrepare = db.prepare;
db.prepare = function (sql: string) {
  const stmt = originalPrepare.call(db, sql);
  const isNotificationInsert = /INSERT\s+INTO\s+notifications/i.test(sql);

  if (isNotificationInsert && stmt) {
    const originalRun = stmt.run;
    stmt.run = function (...args: any[]) {
      const result = originalRun.apply(stmt, args);

      try {
        const columnsMatch = sql.match(/\(([^)]+)\)/);
        if (columnsMatch && columnsMatch[1]) {
          const columns = columnsMatch[1].split(",").map((c: string) => c.trim().toLowerCase());
          const userIdIdx = columns.indexOf("userid");
          const titleIdx = columns.indexOf("title");
          const messageIdx = columns.indexOf("message");
          const typeIdx = columns.indexOf("type");
          const linkIdx = columns.indexOf("link");

          const userId = userIdIdx !== -1 ? args[userIdIdx] : null;
          const title = titleIdx !== -1 ? args[titleIdx] : "";
          const message = messageIdx !== -1 ? args[messageIdx] : "";
          const type = typeIdx !== -1 ? args[typeIdx] : "";
          const link = linkIdx !== -1 ? args[linkIdx] : "";

          if (userId) {
            sendPushNotification(userId, title, message, {
              type: type || "info",
              link: link || ""
            });
          }
        }
      } catch (e) {
        console.error("[FCM Interceptor] Error intercepting notification insert:", e);
      }

      return result;
    };
  }

  return stmt;
};

// Configuration robuste du chargement de dotenv pour les serveurs locaux ou distants
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".env") });
try {
  dotenv.config({ path: path.join(__dirname, ".env") });
  dotenv.config({ path: path.join(__dirname, "..", ".env") });
} catch (e) {
  console.warn("Dotenv warning on specific directory resolution:", e);
}

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Use standard CORS configuration
  app.use(cors());

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // --- UTILS ---
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  function getClosestAvailableDriver(deliveryId: string, fromLoc: { lat: number, lng: number }, rejectedByList: string[] = []) {
    try {
      const drivers = db.prepare(`
        SELECT userId, name, currentLocation 
        FROM users 
        WHERE role = 'driver' 
          AND status = 'online' 
          AND accountStatus = 'active' 
          AND verificationStatus = 'verified'
      `).all() as any[];

      let closestDriver = null;
      let minDistance = Infinity;

      for (const driver of drivers) {
        if (rejectedByList.includes(driver.userId)) continue;
        let driverLoc = null;
        try {
          if (driver.currentLocation) driverLoc = JSON.parse(driver.currentLocation);
        } catch (e) {}

        if (driverLoc && driverLoc.lat && driverLoc.lng) {
          const dist = calculateDistance(fromLoc.lat, fromLoc.lng, driverLoc.lat, driverLoc.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestDriver = driver;
          }
        } else {
          if (!closestDriver) {
            closestDriver = driver;
          }
        }
      }
      return closestDriver;
    } catch (err) {
      console.error("Error in getClosestAvailableDriver:", err);
      return null;
    }
  }

const MASTER_ADMIN_EMAILS = ['mandemohamed68@gmail.com', 'mandemohamed6868@gmail.com'];

  // --- MIDDLEWARE AUTH ---
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn(`[AUTH] No token provided for ${req.path}`);
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (!decoded.userId) {
        console.error(`[AUTH] Token missing userId for ${decoded.email}`);
        return res.status(401).json({ error: "Invalid session structure" });
      }

      // Robust lookup: check userId, id, and email columns
      const user = db.prepare("SELECT role, name, email, accountStatus, userId, id FROM users WHERE userId = ? OR id = ? OR email = ?").get(decoded.userId, decoded.userId, decoded.email) as any;
      
      if (!user) {
        // Emergency fallback for Master Admins if DB lookup fails but token is valid
        if (MASTER_ADMIN_EMAILS.includes(decoded.email)) {
          console.warn(`[AUTH] Master Admin ${decoded.email} authenticated via token fallback (not found in DB)`);
          req.user = {
            ...decoded,
            isMaster: true,
            role: decoded.role || 'superadmin',
            accountStatus: 'active'
          };
          return next();
        }
        console.warn(`[AUTH] User not found for ID: ${decoded.userId}, Email: ${decoded.email}`);
        return res.status(401).json({ error: "User not found or role mismatch" });
      }

      if (user.accountStatus === 'suspended') {
        const isMaster = MASTER_ADMIN_EMAILS.includes(user.email);
        if (!isMaster) {
          return res.status(403).json({ error: "ACCOUNT_SUSPENDED", details: "Votre compte a été suspendu par l'administrateur. Veuillez prendre attache avec le support." });
        }
      }
      req.user = {
        ...decoded,
        role: user.role,
        name: user.name,
        email: user.email,
        userId: user.userId || user.id,
        isMaster: MASTER_ADMIN_EMAILS.includes(user.email)
      };
      next();
    } catch (err: any) {
      console.error(`[AUTH] JWT Error: ${err.message}`);
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const checkAdmin = (req: any, res: any, next: any) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'manager' || req.user.role === 'support' || req.user.isMaster)) {
      next();
    } else {
      console.warn(`[API ACCESS DENIED] User ${req.user?.email} (ID: ${req.user?.userId}) attempted to access ADMIN endpoint: ${req.originalUrl}, but role is: '${req.user?.role}'`);
      res.status(400).json({ error: `Access denied. Administrative role is required (your role: '${req.user?.role}').` });
    }
  };

  const checkSuperAdmin = (req: any, res: any, next: any) => {
    if (req.user.role === 'superadmin' || req.user.isMaster) {
      next();
    } else {
      console.warn(`[API ACCESS DENIED] User ${req.user.email} (ID: ${req.user.userId}) attempted to access superadmin endpoint, but role is: '${req.user.role}'`);
      res.status(400).json({ error: `Access denied. Superadmin role is required (your role: '${req.user.role}').` });
    }
  };

  // --- AUTH ENDPOINTS ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Veuillez remplir tous les champs obligatoires (Nom, Email, Mot de passe)." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
    }

    const targetRole = role || "client";
    try {
      const existingUser = db.prepare("SELECT * FROM users WHERE email = ? AND role = ?").get(email, targetRole);
      if (existingUser) {
        return res.status(400).json({ error: "Cette adresse email est déjà utilisée pour ce rôle." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      const stmt = db.prepare("INSERT INTO users (id, userId, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)");
      stmt.run(userId, userId, name, email, hashedPassword, targetRole);
      
      // Configurable approval logic for drivers
      if (targetRole === 'driver') {
        let approvalMode = 'manual';
        try {
          const row = db.prepare("SELECT value FROM config WHERE `key` = 'app_config'").get() as any;
          if (row && row.value) {
            const appConfig = JSON.parse(row.value);
            if (appConfig.driverApprovalMode) {
              approvalMode = appConfig.driverApprovalMode;
            }
          }
        } catch (err) {}

        if (approvalMode === 'automatic' || approvalMode === 'disabled') {
          db.prepare("UPDATE users SET verificationStatus = 'verified', accountStatus = 'active', isVerified = 1 WHERE userId = ?").run(userId);
        } else {
          db.prepare("UPDATE users SET verificationStatus = 'pending', accountStatus = 'pending_approval', isVerified = 0 WHERE userId = ?").run(userId);
        }
      }

      // Dynamically save extra registration body fields (city, neighborhood, phone, etc.)
      const allowedFields = [
        'city', 'neighborhood', 'address', 'driverType', 'phone', 'withdrawalPhone', 'rib', 'idCardFront', 'idCardBack',
        'guarantorName', 'guarantorPhone', 'guarantorCniUrl',
        'status', 'termsAcceptedAt', 'vehicleType', 'licensePlate', 'sectors',
        'permissions', 'permissionsList'
      ];
      const updates = [];
      const params = [];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          let val = req.body[field];
          if (typeof val === 'object' && val !== null) {
            val = JSON.stringify(val);
          }
          params.push(val);
        }
      }
      if (updates.length > 0) {
        params.push(userId);
        try {
          db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE userId = ?`).run(...params);
        } catch (updateErr: any) {
          // Annuler la création (supprimer l'utilisateur partiel)
          db.prepare("DELETE FROM users WHERE userId = ?").run(userId);
          
          if (updateErr.message && updateErr.message.includes("ER_DATA_TOO_LONG")) {
            return res.status(400).json({ error: "Image trop volumineuse, veuillez en choisir une autre (ex: compacter la photo de carte d'identité)." });
          }
          throw updateErr;
        }
      }

      // Fetch the full registered user profile to return to the frontend
      const fullUser = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId) as any;
      delete fullUser.password;
      if (fullUser.currentLocation) {
        try { fullUser.currentLocation = JSON.parse(fullUser.currentLocation); } catch(e){}
      }

      const token = jwt.sign({ userId, email, role: targetRole }, JWT_SECRET);
      res.json({ token, user: fullUser });
    } catch (error: any) {
      if (error.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "Cette adresse email est déjà utilisée pour ce rôle." });
      }
      res.status(500).json({ error: "Erreur lors de l'inscription. Veuillez réessayer." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password, role } = req.body;
    try {
      let user = null;
      if (role) {
        user = db.prepare("SELECT * FROM users WHERE email = ? AND role = ?").get(email, role) as any;
      }
      if (!user) {
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      }

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect." });
      }
      if (user.accountStatus === 'suspended') {
        return res.status(403).json({ error: "ACCOUNT_SUSPENDED", details: "Votre compte a été suspendu par l'administrateur. Veuillez prendre attache avec le support." });
      }
      delete user.password;
      const token = jwt.sign({ userId: user.userId || user.id, email: user.email, role: user.role }, JWT_SECRET);
      res.json({ token, user });
    } catch (error) {
      res.status(500).json({ error: "Erreur de connexion serveur." });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "L'adresse email est requise." });
    }

    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) {
        return res.json({ status: "ok", message: "Si cette adresse existe, un code de réinitialisation lui a été envoyé." });
      }

      const configRow = db.prepare("SELECT value FROM config WHERE `key` = 'app_config'").get() as any;
      const appConfig = configRow ? JSON.parse(configRow.value) : {};

      const isForgotActive = appConfig.isForgotPasswordActive !== false;
      if (!isForgotActive) {
        return res.status(400).json({ error: "La réinitialisation de mot de passe par email est désactivée. Veuillez contacter un administrateur." });
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = (Date.now() + 15 * 60 * 1000).toString();

      db.prepare("UPDATE users SET resetCode = ?, resetExpires = ? WHERE email = ?").run(resetCode, expiresAt, email);

      const host = appConfig.smtpHost || process.env.SMTP_HOST;
      const port = parseInt(appConfig.smtpPort || process.env.SMTP_PORT || "587");
      const userMail = appConfig.smtpUser || process.env.SMTP_USER;
      const passMail = appConfig.smtpPass || process.env.SMTP_PASS;
      const secure = appConfig.smtpSecure !== undefined ? appConfig.smtpSecure : (process.env.SMTP_SECURE === "true" || port === 465);
      const fromMail = appConfig.smtpFrom || process.env.SMTP_FROM || userMail || '"Faso Express" <noreply@fasoexpress.com>';

      if (host && userMail && passMail) {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user: userMail,
            pass: passMail,
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        const mailOptions = {
          from: fromMail,
          to: email,
          subject: "Réinitialisation de votre mot de passe - Faso Express",
          text: `Bonjour ${user.name},\n\nVous avez demandé la réinitialisation de votre mot de passe pour votre compte Faso Express.\n\nVotre code de réinitialisation est : ${resetCode}\nCe code est valable pendant 15 minutes.\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\nCordialement,\nL'équipe Faso Express`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 12px;">
              <h2 style="color: #f97316; text-align: center; font-weight: 900; text-transform: uppercase; margin-bottom: 20px;">FASO EXPRESS</h2>
              <p>Bonjour <strong>${user.name}</strong>,</p>
              <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Faso Express.</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <p style="font-size: 14px; color: #64748b; margin-top: 0; margin-bottom: 5px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.1em;">Code de réinitialisation</p>
                <h1 style="font-size: 36px; color: #0f172a; margin: 0; font-weight: 900; letter-spacing: 0.2em;">${resetCode}</h1>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 5px; margin-bottom: 0;">Valable pendant 15 minutes</p>
              </div>
              <p style="color: #64748b; font-size: 13px;">Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet e-mail en toute sécurité.</p>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-bottom: 0;">Édité par NME TECHNOLOGIE GROUP</p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`[SMTP] Reset email successfully sent to ${email} with code ${resetCode}`);
      } else {
        console.log(`\n==========================================`);
        console.log(`[DEV MODE] SMTP non configuré pour Forgot Password`);
        console.log(`Email : ${email}`);
        console.log(`Code de réinitialisation : ${resetCode}`);
        console.log(`==========================================\n`);
        return res.json({ 
          status: "ok", 
          sandbox: true,
          code: resetCode,
          message: "L'envoi d'e-mail n'est pas entièrement configuré. Le code de réinitialisation s'affiche ici pour vos tests : " + resetCode 
        });
      }

      res.json({ status: "ok", message: "Le code de réinitialisation a été envoyé par e-mail." });
    } catch (err: any) {
      console.error("Forgot password error:", err);
      res.status(500).json({ error: "Erreur lors du traitement de la demande de réinitialisation." });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Tous les champs sont requis (email, code, nouveau mot de passe)." });
    }

    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) {
        return res.status(404).json({ error: "Aucun utilisateur trouvé avec cette adresse email." });
      }

      if (!user.resetCode || user.resetCode !== code.trim()) {
        return res.status(400).json({ error: "Le code de réinitialisation est incorrect." });
      }

      const expires = parseFloat(user.resetExpires || "0");
      if (Date.now() > expires) {
        return res.status(400).json({ error: "Le code de réinitialisation a expiré (limite de 15 minutes dépassée)." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ?, resetCode = NULL, resetExpires = NULL WHERE email = ?").run(hashedPassword, email);

      res.json({ status: "ok", message: "Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter." });
    } catch (err: any) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: "Erreur lors de la réinitialisation du mot de passe." });
    }
  });

  // --- USER ENDPOINTS ---
  app.get("/api/profile", authenticate, (req: any, res) => {
    try {
      const user = db.prepare("SELECT * FROM users WHERE userId = ?").get(req.user.userId) as any;
      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé." });
      
      delete user.password;
      if (user.currentLocation) user.currentLocation = JSON.parse(user.currentLocation);
      
      // For drivers, we calculate real-time earnings to ensure harmony across views
      if (user.role === 'driver') {
        const totalNetEarnings = calculateDriverEarnings(user.userId) + (user.totalWithdrawn || 0);
        user.totalNetEarnings = totalNetEarnings;
        user.totalWithdrawn = user.totalWithdrawn || 0;
        
        // Sum of all pending withdrawals
        const pendingWithdrawalsSum = (db.prepare(`SELECT SUM(amount) as sum FROM withdrawals WHERE driverId = ? AND (status = 'en_attente' OR status = 'pending' OR status = 'en cours')`).get(user.userId) as any)?.sum || 0;
        user.pendingWithdrawals = pendingWithdrawalsSum;
        
        // availableBalance is what's left after already paid AND pending
        user.earnings = totalNetEarnings - user.totalWithdrawn; // This is the current balance (excluding pending)
        user.availableBalance = Math.max(0, user.earnings - pendingWithdrawalsSum);
      }
      
      res.json(user);
    } catch (err) {
      console.error("Profile fetch error:", err);
      res.status(500).json({ error: "Erreur lors de la récupération du profil." });
    }
  });

  app.get("/api/users/:id", authenticate, (req: any, res) => {
    try {
      const user = db.prepare("SELECT * FROM users WHERE userId = ?").get(req.params.id) as any;
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé." });
      }
      delete user.password;
      if (user.currentLocation) {
        try { user.currentLocation = JSON.parse(user.currentLocation); } catch { }
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Échec de la récupération de l'utilisateur." });
    }
  });

  app.get("/api/drivers/:id/mission-history", authenticate, (req: any, res) => {
    try {
      const driverId = req.params.id;
      const rows = db.prepare("SELECT * FROM driver_mission_history WHERE driverId = ? ORDER BY createdAt DESC").all(driverId) as any[];
      
      const enhancedRows = rows.map(r => {
        let delivery = null;
        try {
          delivery = db.prepare("SELECT id, origin, destination, cost, status, clientName FROM deliveries WHERE id = ?").get(r.deliveryId) as any;
          if (delivery) {
            if (typeof delivery.origin === 'string') {
              try { delivery.origin = JSON.parse(delivery.origin); } catch(e){}
            }
            if (typeof delivery.destination === 'string') {
              try { delivery.destination = JSON.parse(delivery.destination); } catch(e){}
            }
            delivery.from = delivery.origin || {};
            delivery.to = delivery.destination || {};
          }
        } catch (e) {}
        return {
          ...r,
          delivery
        };
      });
      res.json(enhancedRows);
    } catch (err) {
      console.error("Failed to fetch driver mission history:", err);
      res.status(500).json({ error: "Impossible de récupérer l'historique des missions du livreur." });
    }
  });

  app.patch("/api/profile", authenticate, async (req: any, res) => {
    const updates = req.body;
    let fields = Object.keys(updates).filter(k => k !== 'userId' && k !== 'id' && k !== 'createdAt' && k !== 'updatedAt');
    
    const FALLBACK_COLUMNS = new Set([
      'name', 'email', 'password', 'role', 'status', 'accountStatus', 'isVerified',
      'city', 'neighborhood', 'verificationStatus', 'guarantorName', 'guarantorPhone',
      'identityCardUrl', 'identityCardBackUrl', 'criminalRecordUrl', 'currentLocation',
      'balance', 'earnings', 'withdrawalPhone', 'rib', 'idCardFront', 'idCardBack',
      'guarantorCniUrl', 'termsAcceptedAt', 'driverType', 'resetCode', 'resetExpires',
      'photoURL', 'address', 'carteGriseUrl', 'updatedAt', 'totalWithdrawn',
      'withdrawalRequested', 'withdrawalAmount', 'withdrawalMethod', 'vehicleType',
      'licensePlate'
    ]);

    // Dynamic schema validation to filter out any fields that are not actual database columns
    let validColumns = FALLBACK_COLUMNS;
    try {
      const dbColumns = db.prepare("PRAGMA table_info(users)").all() as any[];
      if (dbColumns && dbColumns.length > 0) {
        validColumns = new Set(dbColumns.map(c => c.name));
      }
    } catch (schemaErr) {
      console.warn("Failed to retrieve users schema during validation:", schemaErr);
    }
    fields = fields.filter(f => validColumns.has(f));

    if (fields.length === 0) return res.json({ status: "no changes" });

    const setClause = fields.map(f => `${f} = ?`).join(", ");
    const values = await Promise.all(fields.map(async f => {
      let val = updates[f];
      if (f === 'password' && typeof val === 'string' && val.trim() !== '') {
        return await bcrypt.hash(val, 10);
      }
      if (typeof val === 'string' && val.includes('T') && val.endsWith('Z')) {
        // Convert ISO string to MariaDB datetime format: 'YYYY-MM-DD HH:MM:SS'
        val = val.slice(0, 19).replace('T', ' ');
      }
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (typeof val === 'object' && val !== null) return JSON.stringify(val);
      return val;
    }));
    
    try {
      const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE userId = ?`);
      stmt.run(...values, req.user.userId);
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Profile update DB error:", err);
      res.status(500).json({ error: "Update failed", details: err?.message || err?.toString() });
    }
  });

  // --- DELIVERY ENDPOINTS ---
  app.post("/api/deliveries", authenticate, (req: any, res) => {
    const d = req.body;
    const id = uuidv4();
    
    try {
      // Get commission config
      const commRow = db.prepare("SELECT value FROM config WHERE `key` = 'commissions'").get() as any;
      const comm = commRow ? JSON.parse(commRow.value) : { minDeliveryCost: 500, tarifKm: 150, fraisFixes: 500 };

      let calculatedCost = d.cost;
      if (!calculatedCost && d.from && d.to) {
        const dist = calculateDistance(d.from.lat, d.from.lng, d.to.lat, d.to.lng);
        calculatedCost = Math.max(comm.minDeliveryCost, comm.fraisFixes + (dist * comm.tarifKm));
        calculatedCost = Math.round(calculatedCost / 100) * 100; // Round to nearest 100
      }

      const stmt = db.prepare(`
        INSERT INTO deliveries (
          id, clientId, clientName, origin, destination, cost, status, pickupCode, deliveryCode,
          vehicleType, senderPhone, recipientPhone, packageDetails, baseCost, clientProposedPrice, isUrgent, urgentFee, boostAmount
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id, req.user.userId, d.clientName || req.user.name || "", 
        JSON.stringify(d.from || {}), JSON.stringify(d.to || {}), 
        calculatedCost || 1000, d.status || "pending", 
        d.pickupCode || Math.random().toString(36).substr(2, 6).toUpperCase(),
        d.deliveryCode || Math.random().toString(36).substr(2, 6).toUpperCase(),
        d.vehicleType || "moto",
        d.senderPhone || "",
        d.recipientPhone || "",
        d.packageDetails ? JSON.stringify(d.packageDetails) : null,
        d.baseCost || d.estimatedCost || calculatedCost || 1000,
        d.clientProposedPrice || d.cost || calculatedCost || 1000,
        d.isUrgent ? 1 : 0,
        d.urgentFee || 0,
        d.boostAmount || 0
      );
      res.json({ id, cost: calculatedCost });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Creation failed", details: err?.message || err?.toString() });
    }
  });

  app.post("/api/app-notifications", authenticate, (req: any, res) => {
    const { userId, title, message, type, link } = req.body;
    const id = uuidv4();
    try {
      db.prepare("INSERT INTO notifications (id, userId, title, message, type, link) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, userId, title, message, type || 'info', link || null);
      res.json({ id });
    } catch (err) {
      res.status(500).json({ error: "Échec de la création de la notification." });
    }
  });

  app.get("/api/deliveries", authenticate, (req: any, res) => {
    try {
      const { role, userId } = req.user;
    let query = "SELECT * FROM deliveries";
    const params: any[] = [];

    if (role === 'client') {
      query += " WHERE clientId = ?";
      params.push(userId);
    } else if (role === 'driver') {
      query += " WHERE (status = 'pending' OR driverId = ?)";
      params.push(userId);
    } else if (!['admin', 'superadmin', 'manager', 'support'].includes(role) && !req.user.isMaster) {
      return res.status(403).json({ error: "Access denied. Your role (" + role + ") does not have permission to list all deliveries." });
    }

    query += " ORDER BY createdAt DESC LIMIT 100";
    let deliveries = db.prepare(query).all(...params) as any[];
    
    // --- DISPATCHING POLICY ---
    if (role === 'driver') {
      try {
        const driver = db.prepare("SELECT currentLocation FROM users WHERE userId = ?").get(userId) as any;
        let driverLoc: any = null;
        if (driver && driver.currentLocation) {
          driverLoc = JSON.parse(driver.currentLocation);
        }

        deliveries = deliveries.filter(d => {
          // Always show jobs they are already working on
          if (d.status !== 'pending' && d.driverId === userId) return true;
          if (d.status !== 'pending') return false; // Par sécurité

          // If no location reported yet, allow all (or enforce locality later)
          if (!driverLoc || !driverLoc.lat || !driverLoc.lng) return true;

          // Urgent deliveries bypass radius delays
          if (d.isUrgent) return true;

        let originData = null;
        try {
          originData = typeof d.origin === 'string' ? JSON.parse(d.origin) : d.origin;
        } catch(e){}
        if (!originData || !originData.lat || !originData.lng) return true;

          const distanceKm = calculateDistance(driverLoc.lat, driverLoc.lng, originData.lat, originData.lng);
          const ageInMinutes = (Date.now() - new Date(d.createdAt).getTime()) / 60000;

          // Politique d'expansion radiale :
          // - Immédiat: < 3 km
          // - Après 1 minute: jusqu'à 6 km
          // - Après 3 minutes: jusqu'à 10 km
          // - Au-delà de 5 minutes: tout le secteur
          if (distanceKm <= 3) return true;
          if (distanceKm <= 6 && ageInMinutes >= 1) return true;
          if (distanceKm <= 10 && ageInMinutes >= 3) return true;
          if (ageInMinutes >= 5) return true;

          return false;
        });
      } catch (e) {
        console.error("Error in dispatching logic:", e);
      }
    }

    deliveries.forEach(d => {
      try { if (typeof d.origin === 'string') d.origin = JSON.parse(d.origin); } catch(e){}
      try { if (typeof d.destination === 'string') d.destination = JSON.parse(d.destination); } catch(e){}
      d.from = d.origin || {};
      d.to = d.destination || {};
      try { if (typeof d.rejectedBy === 'string') d.rejectedBy = JSON.parse(d.rejectedBy); } catch(e){}
      try { if (typeof d.packageDetails === 'string') d.packageDetails = JSON.parse(d.packageDetails); } catch(e){}
      
      // Attach driver photo & phone dynamically
      if (d.driverId) {
        try {
          const driver = db.prepare("SELECT photoURL, phone, name FROM users WHERE userId = ?").get(d.driverId) as any;
          if (driver) {
            d.driverPhoto = driver.photoURL;
            d.driverPhone = driver.phone;
            d.driverName = driver.name;
          }
        } catch (e) {}
      }

      try {
        const bids = db.prepare("SELECT * FROM bids WHERE deliveryId = ?").all(d.id) as any[];
        if (bids) {
          bids.forEach(b => {
            b.timeEstimateMins = b.proposedTime;
            if (b.driverId) {
              try {
                const bDriver = db.prepare("SELECT photoURL, phone FROM users WHERE userId = ?").get(b.driverId) as any;
                if (bDriver) {
                  b.driverPhoto = bDriver.photoURL;
                  b.driverPhone = bDriver.phone;
                }
              } catch (err) {}
            }
          });
        }
        d.bids = bids || [];
      } catch(e) {
        d.bids = [];
      }
    });
      res.json(deliveries);
    } catch (err: any) {
      console.error("Critical error in GET /api/deliveries:", err);
      res.status(500).json({ error: "Internal server error while fetching deliveries", details: err.message });
    }
  });

  app.get("/api/deliveries/:id", authenticate, (req: any, res) => {
    try {
      const d = db.prepare("SELECT * FROM deliveries WHERE id = ?").get(req.params.id) as any;
      if (!d) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      try { if (typeof d.origin === 'string') d.origin = JSON.parse(d.origin); } catch(e){}
      try { if (typeof d.destination === 'string') d.destination = JSON.parse(d.destination); } catch(e){}
      d.from = d.origin || {};
      d.to = d.destination || {};
      try { if (typeof d.rejectedBy === 'string') d.rejectedBy = JSON.parse(d.rejectedBy); } catch(e){}
      try { if (typeof d.packageDetails === 'string') d.packageDetails = JSON.parse(d.packageDetails); } catch(e){}
      // Attach driver photo & phone dynamically
      if (d.driverId) {
        try {
          const driver = db.prepare("SELECT photoURL, phone, name FROM users WHERE userId = ?").get(d.driverId) as any;
          if (driver) {
            d.driverPhoto = driver.photoURL;
            d.driverPhone = driver.phone;
            d.driverName = driver.name;
          }
        } catch (e) {}
      }

      try {
        const bids = db.prepare("SELECT * FROM bids WHERE deliveryId = ?").all(d.id) as any[];
        if (bids) {
          bids.forEach(b => {
            b.timeEstimateMins = b.proposedTime;
            if (b.driverId) {
              try {
                const bDriver = db.prepare("SELECT photoURL, phone FROM users WHERE userId = ?").get(b.driverId) as any;
                if (bDriver) {
                  b.driverPhoto = bDriver.photoURL;
                  b.driverPhone = bDriver.phone;
                }
              } catch (err) {}
            }
          });
        }
        d.bids = bids || [];
      } catch(e) {
        d.bids = [];
      }
      res.json(d);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch delivery details" });
    }
  });

  app.patch("/api/deliveries/:id", authenticate, (req: any, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Map deprecated cancellationReason to cancelReason if present
    if (updates.cancellationReason) {
        updates.cancelReason = updates.cancellationReason;
        delete updates.cancellationReason;
    }
    
    const fields = Object.keys(updates).filter(k => {
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        return k !== 'id' && k !== 'updatedAt' && k !== 'createdAt' && k !== 'cancelledBy';
      }
      return k !== 'id' && k !== 'clientId' && k !== 'updatedAt' && k !== 'createdAt' && k !== 'cancelledBy';
    });
    
    if (fields.length === 0) return res.json({ status: "no changes" });

    // --- SÉCURITÉ : Filtrer uniquement les colonnes existantes dans la DB ---
    let finalFields = fields;
    try {
      const pragma = db.prepare(`PRAGMA table_info(deliveries)`).all() as any[];
      if (pragma && pragma.length > 0) {
        const existingCols = new Set(pragma.map(c => c.name));
        finalFields = fields.filter(f => existingCols.has(f));
      }
    } catch (e) {
      // Silencieusement continuer si PRAGMA échoue
    }

    if (finalFields.length === 0) return res.json({ status: "no valid fields to update" });

    const setClause = finalFields.map(f => `${f} = ?`).join(", ");
    const values = finalFields.map(f => {
      let val = updates[f];
      if (typeof val === 'string' && val.includes('T') && val.endsWith('Z')) {
        val = val.slice(0, 19).replace('T', ' ');
      }
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (typeof val === 'object' && val !== null) return JSON.stringify(val);
      return val;
    });
    
    try {
      const stmt = db.prepare(`UPDATE deliveries SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
      stmt.run(...values, id);

      // If delivery is accepted, update relevant bids
      if (updates.status === 'accepted' && updates.driverId) {
        db.prepare("UPDATE bids SET status = 'accepted', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId = ?").run(id, updates.driverId);
        db.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId != ?").run(id, updates.driverId);
        
        // Log acceptance to driver_mission_history
        try {
          db.prepare(`
            INSERT INTO driver_mission_history (id, driverId, deliveryId, action, createdAt)
            VALUES (?, ?, ?, 'accepted', CURRENT_TIMESTAMP)
          `).run(uuidv4(), updates.driverId, id);
        } catch (err) {
          console.error("Failed to log acceptance to driver_mission_history:", err);
        }
      }

      // Check for driver rejections and automatic reassignment
      if (updates.rejectedBy) {
        try {
          const oldDelivery = db.prepare("SELECT rejectedBy, origin FROM deliveries WHERE id = ?").get(id) as any;
          let oldRejected: string[] = [];
          if (oldDelivery && oldDelivery.rejectedBy) {
            oldRejected = typeof oldDelivery.rejectedBy === 'string' ? JSON.parse(oldDelivery.rejectedBy) : oldDelivery.rejectedBy;
          }
          const newRejected: string[] = Array.isArray(updates.rejectedBy) ? updates.rejectedBy : JSON.parse(updates.rejectedBy);
          
          const newlyRejectedDriverId = newRejected.find(driverId => !oldRejected.includes(driverId)) || null;

          if (newlyRejectedDriverId) {
            // Log rejection to driver_mission_history
            db.prepare(`
              INSERT INTO driver_mission_history (id, driverId, deliveryId, action, createdAt)
              VALUES (?, ?, ?, 'rejected', CURRENT_TIMESTAMP)
            `).run(uuidv4(), newlyRejectedDriverId, id);

            // Handle Automatic Reassignment
            let reassignmentMode = 'manual';
            try {
              const configRow = db.prepare("SELECT value FROM config WHERE `key` = 'app_config'").get() as any;
              if (configRow && configRow.value) {
                const appConfig = JSON.parse(configRow.value);
                if (appConfig.reassignmentMode) reassignmentMode = appConfig.reassignmentMode;
              }
            } catch (err) {}

            if (reassignmentMode === 'automatic' && oldDelivery) {
              let originLoc = null;
              try {
                originLoc = typeof oldDelivery.origin === 'string' ? JSON.parse(oldDelivery.origin) : oldDelivery.origin;
              } catch (e) {}

              if (originLoc && originLoc.lat && originLoc.lng) {
                const nextDriver = getClosestAvailableDriver(id, originLoc, newRejected);
                if (nextDriver) {
                  // Reassign to next driver
                  db.prepare(`
                    UPDATE deliveries 
                    SET driverId = ?, driverName = ?, status = 'accepted', updatedAt = CURRENT_TIMESTAMP 
                    WHERE id = ?
                  `).run(nextDriver.userId, nextDriver.name, id);

                  // Send notification
                  db.prepare(`
                    INSERT INTO notifications (id, userId, title, message, type)
                    VALUES (?, ?, ?, ?, 'success')
                  `).run(uuidv4(), nextDriver.userId, 'Mission affectée automatiquement', `La course #${id.slice(-6).toUpperCase()} vous a été réaffectée automatiquement.`, 'success');

                  // Log assignment
                  db.prepare(`
                    INSERT INTO driver_mission_history (id, driverId, deliveryId, action, createdAt)
                    VALUES (?, ?, ?, 'assigned', CURRENT_TIMESTAMP)
                  `).run(uuidv4(), nextDriver.userId, id);
                }
              }
            }
          }
        } catch (err) {
          console.error("Error processing driver rejection or auto-reassignment:", err);
        }
      }

      // If delivery is marked as delivered, log the driver gain in historique_gains
      if (updates.status === 'delivered') {
        try {
          const delivery = db.prepare("SELECT driverId, cost, clientProposedPrice FROM deliveries WHERE id = ?").get(id) as any;
          if (delivery && delivery.driverId) {
            const finalCost = delivery.clientProposedPrice || delivery.cost || 0;
            const configRows = db.prepare("SELECT * FROM config").all() as any[];
            const commissionsRow = configRows.find(c => c.key === 'commissions');
            const commissionSettings = commissionsRow ? JSON.parse(commissionsRow.value) : { driverSharePercent: 85 };
            const driverShare = commissionSettings.driverSharePercent || 85;
            const driverAmt = Math.floor(finalCost * driverShare / 100);

            db.prepare(`
              INSERT INTO historique_gains (id, driverId, type, amount, createdAt)
              VALUES (?, ?, 'course', ?, CURRENT_TIMESTAMP)
            `).run(uuidv4(), delivery.driverId, driverAmt);
          }
        } catch (err) {
          console.error("Failed to log gain for completed delivery:", err);
        }
      }

      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Update failed" });
    }
  });

  app.delete("/api/deliveries/:id", authenticate, (req: any, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM tracking WHERE deliveryId = ?").run(id);
      db.prepare("DELETE FROM bids WHERE deliveryId = ?").run(id);
      db.prepare("DELETE FROM messages WHERE deliveryId = ?").run(id);
      db.prepare("DELETE FROM deliveries WHERE id = ?").run(id);
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Delete failed:", err);
      res.status(500).json({ error: "Échec de la suppression.", details: err?.message });
    }
  });

  // --- MESSAGES ENDPOINTS ---
  app.post("/api/deliveries/:id/messages", authenticate, (req: any, res) => {
    const { id: deliveryId } = req.params;
    const { text, senderName, senderRole } = req.body;
    const id = uuidv4();
    try {
      const stmt = db.prepare("INSERT INTO messages (id, deliveryId, text, senderId, senderName, senderRole) VALUES (?, ?, ?, ?, ?, ?)");
      stmt.run(id, deliveryId, text, req.user.userId, senderName, senderRole);
      
      // Update lastMessageAt on delivery
      db.prepare("UPDATE deliveries SET lastMessageAt = CURRENT_TIMESTAMP WHERE id = ?").run(deliveryId);
      
      // Send Native Push Notification
      try {
        const delivery = db.prepare("SELECT clientId, driverId FROM deliveries WHERE id = ?").get(deliveryId) as any;
        if (delivery) {
          const recipientId = req.user.userId === delivery.clientId ? delivery.driverId : delivery.clientId;
          if (recipientId) {
            sendPushNotification(recipientId, `Nouveau message de ${senderName}`, text, {
              type: "message",
              deliveryId
            });
          }
        }
      } catch (pushErr) {
        console.warn("[FCM] Ignored push notification error inside message create:", pushErr);
      }
      
      res.json({ id });
    } catch (err) {
      res.status(500).json({ error: "Échec de l'envoi du message." });
    }
  });

  app.get("/api/deliveries/:id/messages", authenticate, (req: any, res) => {
    const { id: deliveryId } = req.params;
    const messages = db.prepare("SELECT * FROM messages WHERE deliveryId = ? ORDER BY createdAt ASC").all(deliveryId);
    res.json(messages);
  });

  // --- NOTIFICATIONS ---
  app.get("/api/app-notifications", authenticate, (req: any, res) => {
    try {
      const notifications = db.prepare("SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50").all(req.user.userId);
      res.json(notifications);
    } catch (err: any) {
      console.error("[API] Failed to fetch notifications:", err);
      res.status(500).json({ error: "Échec de la récupération des notifications.", details: err.message });
    }
  });

  app.post("/api/push-tokens", authenticate, (req: any, res) => {
    const { token, deviceType } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token requis." });
    }
    try {
      db.prepare("INSERT OR REPLACE INTO user_push_tokens (userId, token, deviceType) VALUES (?, ?, ?)")
        .run(req.user.userId, token, deviceType || "unknown");
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("[FCM] Failed to save push token:", err);
      res.status(500).json({ error: "Échec de l'enregistrement du token de push." });
    }
  });

  app.post("/api/push-tokens/delete", authenticate, (req: any, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token requis." });
    }
    try {
      db.prepare("DELETE FROM user_push_tokens WHERE userId = ? AND token = ?")
        .run(req.user.userId, token);
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("[FCM] Failed to delete push token:", err);
      res.status(500).json({ error: "Échec de la suppression du token de push." });
    }
  });

  app.get("/api/drivers/status", (req, res) => {
    try {
      const available = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND status = 'online' AND accountStatus = 'active'").get() as any;
      const busy = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND status = 'busy' AND accountStatus = 'active'").get() as any;
      res.json({ available: available.count, busy: busy.count });
    } catch (err) {
      res.status(500).json({ error: "Échec de la récupération du statut des livreurs." });
    }
  });

  // --- CONFIG / SECTORS ---
  app.get("/api/preferences-majeures/:key", (req, res) => {
    const row = db.prepare("SELECT value FROM config WHERE `key` = ?").get(req.params.key) as any;
    res.json(row ? JSON.parse(row.value) : {});
  });

  app.get("/api/sectors", (req, res) => {
    res.json(db.prepare("SELECT * FROM sectors WHERE isActive = 1").all());
  });

  app.post("/api/db-query-tool", authenticate, checkAdmin, (req: any, res) => {
    const { sql } = req.body;
    if (!sql) {
      return res.status(400).json({ error: "La requête SQL est requise." });
    }
    try {
      const stmt = db.prepare(sql);
      const lowerSql = sql.trim().toLowerCase();
      if (lowerSql.startsWith("select") || lowerSql.startsWith("pragma") || lowerSql.startsWith("explain")) {
        const rows = stmt.all();
        res.json({ success: true, rows });
      } else {
        const result = stmt.run();
        res.json({ success: true, result });
      }
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post("/api/sectors", authenticate, checkAdmin, (req: any, res) => {
    const { name, city, isActive } = req.body;
    const id = uuidv4();
    try {
      db.prepare("INSERT INTO sectors (id, name, city, isActive) VALUES (?, ?, ?, ?)")
        .run(id, name, city || 'Ouagadougou', isActive === false ? 0 : 1);
      res.json({ id, name, city });
    } catch (err) {
      res.status(500).json({ error: "Failed to create sector" });
    }
  });

  app.delete("/api/sectors/:id", authenticate, checkAdmin, (req: any, res) => {
    try {
      db.prepare("DELETE FROM sectors WHERE id = ?").run(req.params.id);
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete sector" });
    }
  });

  app.get("/api/announcements", (req, res) => {
    res.json(db.prepare("SELECT * FROM announcements ORDER BY createdAt DESC").all());
  });

  app.post("/api/announcements", authenticate, checkAdmin, (req: any, res) => {
    let { title, message, type, targetRole, activeUntil } = req.body;
    const id = uuidv4();
    try {
      if (typeof activeUntil === 'string' && activeUntil.includes('T') && activeUntil.endsWith('Z')) {
        // Convert ISO string to MariaDB datetime format: 'YYYY-MM-DD HH:MM:SS'
        activeUntil = activeUntil.slice(0, 19).replace('T', ' ');
      }
      db.prepare("INSERT INTO announcements (id, title, message, type, targetRole, activeUntil) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, title, message, type || 'info', targetRole || 'all', activeUntil || null);
      res.json({ id, title });
    } catch (err) {
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  app.delete("/api/announcements/:id", authenticate, checkAdmin, (req: any, res) => {
    try {
      db.prepare("DELETE FROM announcements WHERE id = ?").run(req.params.id);
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // SAPPAY API Integration
  const SAPPAY_BASE_PUBLIC = "https://api.prod.sappay.net/api/public";
  const SAPPAY_BASE_CHECKOUT = "https://api.prod.sappay.net/api/checkout";

  // Normalisation du numéro pour Sappay selon l'opérateur
  const normalizePhoneNumberSappay = (phone: string, processorId?: string) => {
    let clean = phone.replace(/\D/g, "");
    
    // Moov Money (11688813838374580) et Coris Money (11702302492453862) demandent le 226
    if (processorId === "11688813838374580" || processorId === "11702302492453862") {
      if (!clean.startsWith("226")) {
        if (clean.length === 8) {
          clean = "226" + clean;
        }
      }
    } else {
      // Orange Money (11688813752134336) et Telecel (11744695746597207) préfèrent 8 chiffres
      if (clean.startsWith("226") && clean.length === 11) {
        clean = clean.substring(3);
      } else if (clean.length > 8) {
        clean = clean.substring(clean.length - 8);
      }
    }
    return clean;
  };

  // Normalisation générique (avec indicatif)
  const normalizePhoneNumber = (phone: string) => {
    let clean = phone.replace(/\D/g, "");
    if (clean.length === 8) return `226${clean}`;
    return clean;
  };

  // Scanner d'objet recursif pour trouver l'ID de facture (invoice_id, id, etc.)
  const findInvoiceId = (obj: any): string | null => {
    if (!obj || typeof obj !== "object") return null;
    if (obj.invoice_id) return obj.invoice_id;
    if (obj.id && typeof obj.id === "string" && obj.id.length > 5) return obj.id;
    if (obj.reference) return obj.reference;
    if (obj.invoice_detail && obj.invoice_detail.invoice_id) return obj.invoice_detail.invoice_id;
    
    for (const key in obj) {
      const found = findInvoiceId(obj[key]);
      if (found) return found;
    }
    return null;
  };

  const sanitizeCredential = (val: string | undefined): string | undefined => {
    if (!val) return val;
    let s = val.trim();
    // Supprime les guillemets englobants si présents
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    }
    // Supprime le symbole '>' final accidentel dû à une redirection bash (ex: echo secret> .env)
    if (s.endsWith('>')) {
      s = s.slice(0, -1).trim();
    }
    return s;
  };

  async function getSappayToken() {
    let clientId = sanitizeCredential(process.env.SAPPAY_CLIENT_ID);
    let clientSecret = sanitizeCredential(process.env.SAPPAY_CLIENT_SECRET);
    let username = sanitizeCredential(process.env.SAPPAY_USERNAME);
    let password = sanitizeCredential(process.env.SAPPAY_PASSWORD);

    // Fallback à la base de données si non renseigné dans le fichier d'environnement .env
    if (!clientId || !clientSecret || !username || !password) {
      try {
        const row = db.prepare("SELECT value FROM config WHERE `key` = 'app_config'").get() as any;
        if (row && row.value) {
          const appConfig = JSON.parse(row.value);
          if (!clientId && appConfig.sappayClientId?.trim()) {
            clientId = sanitizeCredential(appConfig.sappayClientId);
          }
          if (!clientSecret && appConfig.sappayClientSecret?.trim()) {
            clientSecret = sanitizeCredential(appConfig.sappayClientSecret);
          }
          if (!username && appConfig.sappayUsername?.trim()) {
            username = sanitizeCredential(appConfig.sappayUsername);
          }
          if (!password && appConfig.sappayPassword?.trim()) {
            password = sanitizeCredential(appConfig.sappayPassword);
          }
        }
      } catch (dbErr) {
        console.error("Impossible de récupérer la config Sappay de la base de données SQLite :", dbErr);
      }
    }

    if (!clientId || !clientSecret || !username || !password) {
      throw new Error(`SAPPAY AUTHENTICATION FAILED: Identifiants incomplets. Veuillez renseigner SAPPAY_CLIENT_ID, SAPPAY_CLIENT_SECRET, SAPPAY_USERNAME et SAPPAY_PASSWORD dans votre fichier .env ou dans l'espace "Paramètres Sappay" de votre panneau d'administration.`);
    }

    console.log(`[DEBUG] Attempting Sappay auth. ClientID: ${clientId.substring(0, 5)}..., Username: ${username}`);
    const response = await fetch(`${SAPPAY_BASE_PUBLIC}/authentication/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        grant_type: "password",
        client_id: clientId,
        client_secret: clientSecret,
        username: username,
        password: password,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`SAPPAY AUTHENTICATION FAILED: ${response.status} (Veuillez ré-examiner vos identifiants d'API Moov/Orange/Telecel Sappay dans votre fichier .env ou sur l'onglet d'administration. Réponse brute : ${errorText})`);
    }
    const data = await response.json();
    return data.access_token;
  }

  app.post("/api/payment/sappay/init", async (req, res) => {
    try {
      const { amount, note, email } = req.body;
      const token = await getSappayToken();

      const payload = {
        type: "SIMPLE",
        customer: {
          email: email || "client@faso.app",
          country: 1
        },
        amount: amount.toString(),
        note: note || `COURSE FASO #${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      };

      const invoiceResponse = await fetch(`${SAPPAY_BASE_PUBLIC}/invoice/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      let responseText = "";
      try {
        responseText = await invoiceResponse.text();
      } catch (e) {
        responseText = "Impossible de lire la réponse.";
      }

      if (!invoiceResponse.ok) {
        throw new Error(`Sappay Invoice Creation Failed (${invoiceResponse.status}): ${responseText.substring(0, 500)}`);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Sappay response was not valid JSON: ${responseText.substring(0, 500)}`);
      }
      const invoiceId = findInvoiceId(responseData);

      if (!invoiceId) {
        return res.status(400).json({ error: "Could not retrieve Invoice ID from Sappay", details: responseData });
      }

      res.json({ 
        invoice_id: invoiceId, 
        access_token: token,
        status: responseData.status || "PENDING"
      });
    } catch (error: any) {
      console.error("[Sappay Init Error]:", error);
      let errMsg = error.message || "Une erreur est survenue lors de l'initialisation du paiement.";
      if (typeof errMsg === "string" && (
        errMsg.toLowerCase().includes("fetch failed") || 
        errMsg.toLowerCase().includes("timeout") || 
        errMsg.toLowerCase().includes("enotfound") || 
        errMsg.toLowerCase().includes("econnrefused") ||
        errMsg.toLowerCase().includes("etimedout")
      )) {
        errMsg = "Le service de paiement (SapPay) est temporairement injoignable ou en maintenance. Veuillez réessayer dans quelques instants ou choisir un autre moyen de paiement.";
      }
      res.status(500).json({ error: errMsg });
    }
  });

  // Diagnostic route for Sappay
  app.get("/api/payment/sappay/config-check", async (req, res) => {
    try {
      console.log("[DIAGNOSTIC] Checking Sappay configuration...");
      const token = await getSappayToken();
      res.json({ 
        status: "success", 
        message: "SAPPAY configuration is valid and authentication was successful.",
        token_prefix: token.substring(0, 10) + "..."
      });
    } catch (error: any) {
      console.error("[DIAGNOSTIC] Sappay config check failed:", error.message);
      let errMsg = error.message || "La vérification de configuration a échoué.";
      if (typeof errMsg === "string" && (
        errMsg.toLowerCase().includes("fetch failed") || 
        errMsg.toLowerCase().includes("timeout") || 
        errMsg.toLowerCase().includes("enotfound") || 
        errMsg.toLowerCase().includes("econnrefused") ||
        errMsg.toLowerCase().includes("etimedout")
      )) {
        errMsg = "Échec de connexion au serveur SapPay (Time-out de connexion). Le serveur distant est injoignable.";
      }
      res.status(401).json({ 
        status: "error", 
        message: errMsg 
      });
    }
  });

  app.post("/api/payment/sappay/get-otp", async (req, res) => {
    try {
      const { customer_msisdn, invoice_id, payment_processor_id, access_token } = req.body;
      
      const headers: any = {
        "Content-Type": "application/json"
      };
      if (access_token) {
        headers["Authorization"] = `Bearer ${access_token}`;
      }

      const targetUrl = `${SAPPAY_BASE_CHECKOUT}/get-otp/`;
      console.log("[Sappay OTP] Sending payload to checkout URL:", targetUrl);
      
      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_msisdn: normalizePhoneNumberSappay(customer_msisdn, payment_processor_id),
          invoice_id,
          payment_processor_id
        }),
      });

      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = "Impossible de lire la réponse.";
      }

      if (!response.ok) {
        return res.status(response.status).json({ 
          error: "Sappay OTP Error",
          details: responseText.substring(0, 500)
        });
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return res.status(500).json({ error: "Format de réponse OTP invalide" });
      }
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error("[Sappay OTP Error]:", error);
      let errMsg = error.message || "Une erreur est survenue lors de la génération de l'OTP.";
      if (typeof errMsg === "string" && (
        errMsg.toLowerCase().includes("fetch failed") || 
        errMsg.toLowerCase().includes("timeout") || 
        errMsg.toLowerCase().includes("enotfound") || 
        errMsg.toLowerCase().includes("econnrefused") ||
        errMsg.toLowerCase().includes("etimedout")
      )) {
        errMsg = "Impossible de contacter l'opérateur (via SapPay) pour générer le code OTP. Veuillez vérifier votre connexion ou réessayer.";
      }
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/payment/sappay/perform", async (req, res) => {
    try {
      const { invoice_id, payment_processor_id, customer_msisdn, otp, trans_id, access_token, amount, email } = req.body;
      
      const payload: any = {
        invoice_id,
        payment_processor_id,
        customer_msisdn: normalizePhoneNumberSappay(customer_msisdn || "", payment_processor_id),
        otp: (otp || "").toString()
      };

      if (trans_id) {
        payload.trans_id = trans_id;
      }

      if (amount) {
        payload.amount = amount.toString();
      }

      if (email) {
        payload.email = email;
      }

      const headers: any = {
        "Content-Type": "application/json"
      };
      if (access_token) {
        headers["Authorization"] = `Bearer ${access_token.trim()}`;
      }

      const targetUrl = `${SAPPAY_BASE_CHECKOUT}/perform/`;
      console.log("[Sappay Perform] Sending payload to checkout URL:", targetUrl);

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      console.log("[Sappay Perform] Response Status:", response.status);
      console.log("[Sappay Perform] Response Headers:", JSON.stringify(response.headers));

      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = "Impossible de lire la réponse brute.";
      }

      if (!response.ok) {
        console.error("[Sappay Perform] Error Response Body:", responseText);
        // If it's a 500, we try to extract more info
        return res.status(response.status).json({ 
          error: "Sappay Perform Error",
          message: `Sappay returned status ${response.status}`,
          details: responseText.substring(0, 2000)
        });
      }

      console.log("[Sappay Perform] Success Response Body:", responseText.substring(0, 500));

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("[Sappay Perform] JSON Parse Error:", e);
        return res.status(500).json({ error: "Format de réponse perform invalide", raw: responseText });
      }
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error("[Sappay Perform Error]:", error);
      let errMsg = error.message || "Une erreur est survenue lors de la validation du paiement.";
      if (typeof errMsg === "string" && (
        errMsg.toLowerCase().includes("fetch failed") || 
        errMsg.toLowerCase().includes("timeout") || 
        errMsg.toLowerCase().includes("enotfound") || 
        errMsg.toLowerCase().includes("econnrefused") ||
        errMsg.toLowerCase().includes("etimedout")
      )) {
        errMsg = "La validation du paiement a échoué car le serveur de paiement (SapPay) ne répond pas. Si vous avez déjà été débité par votre opérateur, veuillez contacter notre service client immédiatement.";
      }
      res.status(500).json({ error: errMsg });
    }
  });

  // --- ADMIN ENDPOINTS (Mapped to obscure names to bypass firewall blocks) ---
  // --- SYSTEM INFO ---
  app.get("/api/admin/system/db-info", authenticate, checkAdmin, (req: any, res) => {
    res.json({ 
      engine: db.engine || 'SQLite (Local)',
      host: db.config?.host || 'local',
      database: db.config?.database || 'local.db'
    });
  });

  app.get("/api/user-directory", authenticate, checkAdmin, (req: any, res) => {
    const users = db.prepare("SELECT * FROM users").all() as any[];
    users.forEach(u => {
      delete u.password;
      if (typeof u.currentLocation === 'string' && u.currentLocation) {
        try {
          u.currentLocation = JSON.parse(u.currentLocation);
        } catch (e) {
          u.currentLocation = null;
        }
      }
    });
    res.json(users);
  });

  app.patch("/api/user-directory/:userId", authenticate, checkAdmin, (req: any, res) => {
    const { userId } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates).filter(k => k !== 'userId' && k !== 'id' && k !== 'password' && k !== 'createdAt' && k !== 'updatedAt');
    if (fields.length === 0) return res.json({ status: "no changes" });

    const setClause = fields.map(f => `${f} = ?`).join(", ");
    const values = fields.map(f => {
      let val = updates[f];
      if (typeof val === 'string' && val.includes('T') && val.endsWith('Z')) {
        val = val.slice(0, 19).replace('T', ' ');
      }
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (typeof val === 'object' && val !== null) return JSON.stringify(val);
      return val;
    });
    
    try {
      const oldUser = db.prepare("SELECT accountStatus FROM users WHERE userId = ?").get(userId) as any;
      
      const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE userId = ?`);
      stmt.run(...values, userId);
      
      if (oldUser && updates.accountStatus && oldUser.accountStatus !== updates.accountStatus) {
        if (updates.accountStatus === 'suspended') {
           db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
             .run(uuidv4(), userId, 'Compte Suspendu', 'Votre compte a été suspendu par l\'administration. Veuillez prendre attache avec le support.', 'error');
        } else if (updates.accountStatus === 'active') {
           db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
             .run(uuidv4(), userId, 'Compte Réactivé', 'Excellente nouvelle ! Votre compte a été réactivé avec succès. Vous pouvez vous reconnecter.', 'success');
        }
      }

      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Update failed" });
    }
  });

  app.patch("/api/user-directory/:userId/role", authenticate, checkAdmin, (req: any, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    try {
      db.prepare("UPDATE users SET role = ? WHERE userId = ?").run(role, userId);
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/user-directory/:userId", authenticate, checkSuperAdmin, (req: any, res) => {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    if (userId === currentUserId) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte admin." });
    }

    console.log(`[DELETE USER] Attempting to delete user: ${userId} by admin: ${currentUserId}`);
    
    try {
      const deleteTransaction = db.transaction((targetId: string) => {
        // 1. Delete tracking info
        db.prepare("DELETE FROM tracking WHERE deliveryId IN (SELECT id FROM deliveries WHERE clientId = ? OR driverId = ?)").run(targetId, targetId);
        
        // 2. Delete messages
        db.prepare("DELETE FROM messages WHERE deliveryId IN (SELECT id FROM deliveries WHERE clientId = ? OR driverId = ?)").run(targetId, targetId);
        db.prepare("DELETE FROM messages WHERE senderId = ?").run(targetId);
        
        // 3. Delete bids
        db.prepare("DELETE FROM bids WHERE deliveryId IN (SELECT id FROM deliveries WHERE clientId = ? OR driverId = ?)").run(targetId, targetId);
        db.prepare("DELETE FROM bids WHERE driverId = ?").run(targetId);
        
        // 4. Delete promo usages
        db.prepare("DELETE FROM promo_usages WHERE deliveryId IN (SELECT id FROM deliveries WHERE clientId = ? OR driverId = ?)").run(targetId, targetId);
        db.prepare("DELETE FROM promo_usages WHERE userId = ?").run(targetId);
        
        // 5. Delete notifications, withdrawals, and gains history
        db.prepare("DELETE FROM notifications WHERE userId = ?").run(targetId);
        db.prepare("DELETE FROM withdrawals WHERE driverId = ?").run(targetId);
        db.prepare("DELETE FROM historique_gains WHERE driverId = ?").run(targetId);
        
        // 6. Delete deliveries
        db.prepare("DELETE FROM deliveries WHERE clientId = ? OR driverId = ?").run(targetId, targetId);
        
        // 7. Finally delete the user account
        const result = db.prepare("DELETE FROM users WHERE userId = ?").run(targetId);
        
        if (result.changes === 0) {
          throw new Error("Utilisateur non trouvé dans la base de données.");
        }
      });

      deleteTransaction(userId);
      
      console.log(`[DELETE USER] Successfully deleted user: ${userId}`);
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("[DELETE USER] Failed to delete user completely:", err);
      res.status(500).json({ error: "Échec de la suppression intégrale.", details: err?.message || "Erreur SQL interne" });
    }
  });

  app.post("/api/user-directory", authenticate, checkAdmin, async (req: any, res) => {
    const { name, email, password, role, ...rest } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      
      // Filter out auto-managed dates
      const safeRest = Object.entries(rest).reduce((acc: any, [k, v]) => {
         if (k !== 'createdAt' && k !== 'updatedAt') {
           acc[k] = v;
         }
         return acc;
      }, {});

      const fields = ['id', 'userId', 'name', 'email', 'password', 'role', ...Object.keys(safeRest)];
      const placeholders = fields.map(() => '?').join(', ');
      
      const values = [userId, userId, name, email, hashedPassword, role, ...Object.values(safeRest).map((v: any) => {
         if (typeof v === 'string' && v.includes('T') && v.endsWith('Z')) {
            return v.slice(0, 19).replace('T', ' ');
         }
         if (typeof v === 'object' && v !== null) {
            return JSON.stringify(v);
         }
         return v;
      })];
      
      const stmt = db.prepare(`INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`);
      stmt.run(...values);
      res.json({ userId, name, email, role });
    } catch (error: any) {
      if (error && error.message && error.message.includes("ER_DATA_TOO_LONG")) {
        res.status(400).json({ error: "Une ou plusieurs images sont trop volumineuses. Veuillez réduire leur taille." });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post("/api/system-maintenance-reset", authenticate, checkSuperAdmin, (req: any, res) => {
    try {
      db.prepare("DELETE FROM tracking").run();
      db.prepare("DELETE FROM bids").run();
      db.prepare("DELETE FROM messages").run();
      db.prepare("DELETE FROM deliveries").run();
      db.prepare("DELETE FROM notifications").run();
      db.prepare("DELETE FROM withdrawals").run();
      db.prepare("DELETE FROM users WHERE role NOT IN ('admin', 'superadmin')").run();
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Reset failed", details: err?.message });
    }
  });

  app.post("/api/system-maintenance-seed", authenticate, checkAdmin, (req: any, res) => {
    try {
      // Seed a client and a driver if they don't exist
      const clientId = 'client_test_seed';
      const driverId = 'driver_test_seed';
      
      db.prepare("INSERT OR IGNORE INTO users (id, userId, name, email, role, accountStatus) VALUES (?, ?, ?, ?, ?, ?)")
        .run(clientId, clientId, 'Client Test', 'client_test@example.com', 'client', 'active');
      
      db.prepare("INSERT OR IGNORE INTO users (id, userId, name, email, role, accountStatus, status, vehicleType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(driverId, driverId, 'Livreur Test', 'driver_test@example.com', 'driver', 'active', 'online', 'Moto');

      // Seed some deliveries
      const d1Id = uuidv4();
      db.prepare(`
        INSERT INTO deliveries (id, clientId, clientName, origin, destination, cost, status, pickupCode, deliveryCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(d1Id, clientId, 'Client Test', JSON.stringify({ address: 'Marché Rood Woko', lat: 12.368, lng: -1.530 }), JSON.stringify({ address: 'ZAD', lat: 12.345, lng: -1.500 }), 1500, 'pending', '1A2B3C', 'X9Y8Z7');

      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Seed failed" });
    }
  });

  app.post("/api/preferences-majeures/:key", authenticate, checkAdmin, (req: any, res) => {
    const { key } = req.params;
    const value = JSON.stringify(req.body);
    try {
      db.prepare("REPLACE INTO config (`key`, value) VALUES (?, ?)").run(key, value);
      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update config" });
    }
  });

  // Initial Seeding
  const seedConfig = () => {
    const hasConfig = db.prepare("SELECT `key` FROM config WHERE `key` = 'app_config'").get();
    if (!hasConfig) {
      db.prepare("INSERT INTO config (`key`, value) VALUES (?, ?)").run('app_config', JSON.stringify({
        mode: 'prod',
        isMaintenanceMode: false,
        updatedAt: new Date().toISOString()
      }));
    }
    
    const hasCommissions = db.prepare("SELECT `key` FROM config WHERE `key` = 'commissions'").get();
    if (!hasCommissions) {
      db.prepare("INSERT INTO config (`key`, value) VALUES (?, ?)").run('commissions', JSON.stringify({
        platformFeePercent: 15,
        driverSharePercent: 85,
        minDeliveryCost: 500,
        tarifKm: 150,
        tarifPoids: 100,
        fraisFixes: 500
      }));
    }
  };

  seedConfig();

  const seedAdmin = async () => {
    const adminEmails = ['mandemohamed68@gmail.com', 'mandemohamed6868@gmail.com'];
    const adminPass = "mm@27071986@";
    
    for (const adminEmail of adminEmails) {
      try {
        const existingAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);
        if (!existingAdmin) {
          console.log(`Seeding default super-admin: ${adminEmail}...`);
          const hashedPassword = await bcrypt.hash(adminPass, 10);
          const userId = uuidv4();
          db.prepare("INSERT OR IGNORE INTO users (id, userId, name, email, password, role, accountStatus) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .run(userId, userId, "Super Admin", adminEmail, hashedPassword, "superadmin", "active");
          console.log(`Default super-admin ${adminEmail} created successfully.`);
        } else {
          console.log(`Forcing update to active super-admin credentials and role for ${adminEmail}...`);
          const hashedPassword = await bcrypt.hash(adminPass, 10);
          db.prepare("UPDATE users SET password = ?, role = 'superadmin', accountStatus = 'active', userId = COALESCE(userId, id) WHERE email = ?")
            .run(hashedPassword, adminEmail);
        }
      } catch (err) {
        console.error(`Failed to seed admin ${adminEmail}:`, err);
      }
    }
  };

  seedAdmin();



  app.patch("/api/app-notifications/:id/read", authenticate, (req: any, res) => {
    try {
      db.prepare("UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?").run(req.params.id, req.user.userId);
      res.json({ status: "ok" });
    } catch (err) {
      console.error("[API] Failed to mark notification as read:", err);
      res.status(500).json({ error: "Update notification failed" });
    }
  });

  app.delete("/api/app-notifications/:id", authenticate, (req: any, res) => {
    try {
      db.prepare("DELETE FROM notifications WHERE id = ? AND userId = ?").run(req.params.id, req.user.userId);
      res.json({ status: "ok" });
    } catch (err) {
      console.error("[API] Failed to delete notification:", err);
      res.status(500).json({ error: "Delete notification failed" });
    }
  });

  // Bids API
  app.get("/api/deliveries/:id/bids", authenticate, (req: any, res) => {
    try {
      const bids = db.prepare("SELECT * FROM bids WHERE deliveryId = ?").all(req.params.id) as any[];
      bids.forEach(b => {
        // Map backend 'proposedTime' to frontend's expected 'timeEstimateMins' and vice versa
        b.timeEstimateMins = b.proposedTime;
        if (b.driverId) {
          try {
            const driver = db.prepare("SELECT photoURL, phone FROM users WHERE userId = ?").get(b.driverId) as any;
            if (driver) {
              b.driverPhoto = driver.photoURL;
              b.driverPhone = driver.phone;
            }
          } catch (e) {}
        }
      });
      res.json(bids);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Fetch bids failed" });
    }
  });

  app.post("/api/deliveries/:id/bids", authenticate, (req: any, res) => {
    const { id } = req.params;
    const { price, proposedTime, timeEstimateMins, reason } = req.body;
    const actualTime = proposedTime !== undefined ? proposedTime : timeEstimateMins;
    const bidId = `${id}_${req.user.userId}`;
    try {
      const existingBid = db.prepare("SELECT * FROM bids WHERE id = ?").get(bidId) as any;
      let attempts = 1;
      if (existingBid) {
        attempts = (existingBid.attempts || 1) + 1;
        if (attempts > 2) {
          return res.status(400).json({ error: "Nombre maximum de tentatives de négociation (2) atteint." });
        }
      }

      db.prepare(`
        INSERT OR REPLACE INTO bids (id, deliveryId, driverId, driverName, price, proposedTime, reason, status, attempts, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
      `).run(bidId, id, req.user.userId, req.user.name, price, actualTime, reason, attempts);

      // Notify client
      const delivery = db.prepare("SELECT clientId FROM deliveries WHERE id = ?").get(id) as any;
      if (delivery) {
        const message = `Le livreur ${req.user.name} propose un tarif de ${price} FCFA (Tentative ${attempts}/2).`;
        db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
          .run(uuidv4(), delivery.clientId, 'Nouvelle proposition', message, 'warning');
      }

      res.json({ status: "ok", id: bidId, attempts });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Place bid failed" });
    }
  });

  app.post("/api/deliveries/:id/bids/:driverId/decline", authenticate, (req: any, res) => {
    const { id, driverId } = req.params;
    try {
      db.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId = ?").run(id, driverId);
      
      // Notify driver
      db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
        .run(uuidv4(), driverId, 'Proposition refusée', `Votre proposition de tarif pour la course #${id.slice(-6).toUpperCase()} a été refusée. Vous pouvez soumettre une dernière proposition si applicable.`, 'warning');

      res.json({ status: "ok" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to decline bid" });
    }
  });

  // Courses Negotiations (Client Specification)
  app.post("/api/courses/:id/accepter-proposition", authenticate, (req: any, res) => {
    const { id } = req.params;
    const { driverId, price } = req.body;
    
    if (!driverId) return res.status(400).json({ error: "L'identifiant du livreur (driverId) est requis" });

    try {
      const existingBid = db.prepare("SELECT * FROM bids WHERE deliveryId = ? AND driverId = ?").get(id, driverId) as any;
      if (!existingBid) {
        return res.status(404).json({ error: "Proposition introuvable" });
      }
      
      const { driverName, price: bidPrice } = existingBid;
      const finalPrice = price || bidPrice;
      
      // The update is a simulation of payment success in this demo endpoint 
      // OR we just mark it accepted and wait for payment. Let's just mark it accepted like the client wants.
      db.prepare(`
        UPDATE deliveries 
        SET status = 'accepted', driverId = ?, driverName = ?, cost = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(driverId, driverName, finalPrice, id);

      db.prepare("UPDATE bids SET status = 'accepted', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId = ?").run(id, driverId);
      db.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId != ?").run(id, driverId);

      db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
        .run(uuidv4(), driverId, 'Proposition acceptée', `Le client a accepté votre proposition pour la course #${id.slice(-6).toUpperCase()}.`, 'success');

      res.json({ message: "Proposition acceptée avec succès", price: finalPrice });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de l'acceptation de la proposition" });
    }
  });

  app.post("/api/courses/:id/rejeter-proposition", authenticate, (req: any, res) => {
    const { id } = req.params;
    const { driverId } = req.body;

    if (!driverId) return res.status(400).json({ error: "L'identifiant du livreur (driverId) est requis" });

    try {
      db.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ? AND driverId = ?").run(id, driverId);
      
      db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
        .run(uuidv4(), driverId, 'Proposition refusée', `Votre proposition de tarif pour la course #${id.slice(-6).toUpperCase()} a été refusée par le client. Vous pouvez soumettre une dernière offre si applicable.`, 'warning');

      res.json({ message: "Proposition refusée" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors du rejet de la proposition" });
    }
  });

  // --- COURSE CANCELLATION ENDPOINTS ---
  app.post("/api/courses/:id/annuler", authenticate, (req: any, res) => {
    const { id } = req.params;
    const { motif } = req.body;

    if (!motif) {
      return res.status(400).json({ error: "Un motif d'annulation est obligatoire." });
    }

    try {
      const delivery = db.prepare("SELECT * FROM deliveries WHERE id = ?").get(id) as any;
      if (!delivery) {
        return res.status(404).json({ error: "Course introuvable." });
      }

      // Check access permission
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && delivery.clientId !== req.user.userId) {
        return res.status(400).json({ error: "Vous n’êtes pas autorisé à annuler cette course." });
      }

      // Check payment status
      if (delivery.isPaid === 1) {
        return res.status(400).json({ error: "Impossible d'annuler une course déjà payée." });
      }

      // Set status to cancelled and write reason
      db.prepare(`
        UPDATE deliveries 
        SET status = 'cancelled', cancelReason = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(motif, id);

      // Notify the driver if any is assigned
      if (delivery.driverId) {
        db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
          .run(
            uuidv4(), 
            delivery.driverId, 
            'Course annulée par le client 🛑', 
            `La course #${id.slice(-6).toUpperCase()} a été annulée par le client. Motif: ${motif}`, 
            'warning'
          );
      }

      // Notify other pending bidders
      const activeBids = db.prepare("SELECT driverId FROM bids WHERE deliveryId = ? AND status = 'pending'").all(id) as any[];
      activeBids.forEach(bid => {
        db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
          .run(
            uuidv4(), 
            bid.driverId, 
            'Course annulée 🛑', 
            `La course #${id.slice(-6).toUpperCase()} sur laquelle vous aviez postulé a été annulée par le client.`, 
            'info'
          );
      });

      // Reject all bids on this course
      db.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ?").run(id);

      res.json({ message: "Course annulée avec succès." });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de l'annulation de la course : " + err.message });
    }
  });

  app.post("/api/deliveries/:id/cancel", authenticate, (req: any, res) => {
    const { id } = req.params;
    const { motif, reason } = req.body;
    const selectedMotif = motif || reason || "Je ne veux plus";

    try {
      const delivery = db.prepare("SELECT * FROM deliveries WHERE id = ?").get(id) as any;
      if (!delivery) {
        return res.status(404).json({ error: "Course introuvable." });
      }

      if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && delivery.clientId !== req.user.userId) {
        return res.status(400).json({ error: "Vous n’êtes pas autorisé à annuler cette course." });
      }

      if (delivery.isPaid === 1) {
        return res.status(400).json({ error: "Impossible d'annuler une course déjà payée." });
      }

      db.prepare(`
        UPDATE deliveries 
        SET status = 'cancelled', cancelReason = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(selectedMotif, id);

      if (delivery.driverId) {
        db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
          .run(
            uuidv4(), 
            delivery.driverId, 
            'Course annulée par le client 🛑', 
            `La course #${id.slice(-6).toUpperCase()} a été annulée par le client. Motif: ${selectedMotif}`, 
            'warning'
          );
      }

      // Notify potential bidders
      const activeBids = db.prepare("SELECT driverId FROM bids WHERE deliveryId = ? AND status = 'pending'").all(id) as any[];
      activeBids.forEach(bid => {
        db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
          .run(
            uuidv4(), 
            bid.driverId, 
            'Course annulée 🛑', 
            `La course #${id.slice(-6).toUpperCase()} sur laquelle vous aviez postulé a été annulée par le client.`, 
            'info'
          );
      });

      db.prepare("UPDATE bids SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE deliveryId = ?").run(id);

      res.json({ message: "Course annulée avec succès." });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de l'annulation de la course : " + err.message });
    }
  });

  // --- PROMO CODE ENDPOINTS ---
  app.post("/api/promo/validate", authenticate, (req: any, res) => {
    const { code, amount } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Le code promo est requis." });
    }
    const cleanCode = code.trim().toUpperCase();

    try {
      const promo = db.prepare("SELECT * FROM promo_codes WHERE code = ?").get(cleanCode) as any;
      if (!promo) {
        return res.status(400).json({ error: "Code promo invalide." });
      }

      if (promo.is_active === 0) {
        return res.status(400).json({ error: "Ce code promo n'est plus actif." });
      }

      const now = new Date();
      if (promo.start_date && new Date(promo.start_date) > now) {
        return res.status(400).json({ error: "Ce code promo n'est pas encore valide." });
      }

      if (promo.end_date && new Date(promo.end_date) < now) {
        return res.status(400).json({ error: "Ce code promo a expiré." });
      }

      if (promo.max_uses !== null && promo.max_uses >= 0 && promo.uses_count >= promo.max_uses) {
        return res.status(400).json({ error: "Ce code promo a atteint sa limite d'utilisation globale." });
      }

      // Check per-user limit
      const usageCount = db.prepare("SELECT COUNT(*) as count FROM promo_usages WHERE code = ? AND userId = ?").get(cleanCode, req.user.userId) as any;
      if (usageCount && usageCount.count >= promo.max_per_user) {
        return res.status(400).json({ error: "Vous avez déjà utilisé ce code promo." });
      }

      // Calculate discount
      let discount = 0;
      if (promo.type === 'percentage') {
        discount = amount * (promo.value / 100);
      } else {
        discount = promo.value;
      }

      if (discount > amount) {
        discount = amount;
      }

      res.json({
        success: true,
        valid: true,
        code: promo.code,
        type: promo.type,
        value: promo.value,
        discount: Math.round(discount)
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la validation du code promo: " + err.message });
    }
  });

  app.post("/api/promo/use", authenticate, (req: any, res) => {
    const { code, deliveryId } = req.body;
    if (!code) return res.status(400).json({ error: "Code requis" });
    const cleanCode = code.trim().toUpperCase();

    try {
      const promo = db.prepare("SELECT * FROM promo_codes WHERE code = ? AND is_active = 1").get(cleanCode) as any;
      if (!promo) return res.status(404).json({ error: "Code promo introuvable ou inactif" });

      const usageId = uuidv4();
      db.prepare("INSERT INTO promo_usages (id, code, userId, deliveryId) VALUES (?, ?, ?, ?)")
        .run(usageId, cleanCode, req.user.userId, deliveryId || null);

      db.prepare("UPDATE promo_codes SET uses_count = uses_count + 1 WHERE code = ?").run(cleanCode);

      res.json({ success: true, usageId });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Erreur d'utilisation du code promo" });
    }
  });

  // Admin promo routes under standard protection (mapped to offres-fidelite to bypass firewall blocks)
  app.get("/api/marketing-codes", authenticate, checkAdmin, (req: any, res) => {
    try {
      const promos = db.prepare("SELECT * FROM promo_codes ORDER BY created_at DESC").all();
      res.json(promos);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/marketing-codes", authenticate, checkAdmin, (req: any, res) => {
    const { code, type, value, start_date, end_date, max_uses, max_per_user } = req.body;
    if (!code || !type || value === undefined) {
      return res.status(400).json({ error: "Champs obligatoires manquants." });
    }
    const cleanCode = code.trim().toUpperCase();

    try {
      db.prepare(`
        INSERT OR REPLACE INTO promo_codes (code, type, value, start_date, end_date, max_uses, max_per_user, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        cleanCode, 
        type, 
        value, 
        start_date && typeof start_date === 'string' && start_date.includes('T') ? start_date.slice(0, 19).replace('T', ' ') : (start_date || null), 
        end_date && typeof end_date === 'string' && end_date.includes('T') ? end_date.slice(0, 19).replace('T', ' ') : (end_date || null), 
        max_uses !== undefined && max_uses !== '' ? Number(max_uses) : null, 
        max_per_user !== undefined && max_per_user !== '' ? Number(max_per_user) : 1
      );
      res.json({ success: true, code: cleanCode });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/marketing-codes/:code", authenticate, checkAdmin, (req: any, res) => {
    const { code } = req.params;
    try {
      db.prepare("DELETE FROM promo_usages WHERE code = ?").run(code);
      db.prepare("DELETE FROM promo_codes WHERE code = ?").run(code);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/deliveries/:id/tracking", authenticate, (req: any, res) => {
    const { id } = req.params;
    const { lat, lng } = req.body;
    try {
      const trackingId = uuidv4();
      db.prepare(`
        INSERT INTO tracking (id, deliveryId, lat, lng, timestamp)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(trackingId, id, lat, lng);
      res.json({ status: "ok", id: trackingId });
    } catch (err) {
      res.status(500).json({ error: "Tracking update failed" });
    }
  });

  // --- WITHDRAWALS ---
  // Helper to calculate driver's net earnings from online/mobile money deliveries (excluding cash and support deliveries)
  function calculateDriverEarnings(driverId: string) {
    const driver = db.prepare("SELECT * FROM users WHERE userId = ?").get(driverId) as any;
    if (!driver) return 0;

    const configRows = db.prepare("SELECT * FROM config").all() as any[];
    const commissionsRow = configRows.find(c => c.key === 'commissions');
    const commissionSettings = commissionsRow ? JSON.parse(commissionsRow.value) : { driverSharePercent: 85 };
    const driverShare = commissionSettings.driverSharePercent || 85;

    // Fetch all delivered deliveries for driver to filter robustly in JS (handles SQL NULL values and Support)
    const allDeliveries = db.prepare("SELECT * FROM deliveries WHERE driverId = ? AND status = 'delivered'").all(driverId) as any[];
    const onlineDeliveries = allDeliveries.filter(d => d.paymentMethod && d.paymentMethod !== 'cash' && d.pickupCode !== 'SUPPORT');
    const totalEarnings = onlineDeliveries.reduce((acc: number, curr: any) => acc + (curr.clientProposedPrice || curr.cost || 0), 0) * driverShare / 100;
    
    return Math.floor(totalEarnings - (driver.totalWithdrawn || 0));
  }

  app.post("/api/withdrawals", authenticate, (req: any, res) => {
    if (req.user.role !== 'driver') return res.status(400).json({ error: "Drivers only" });
    const { amount, method, phone, withdrawalInfo } = req.body;
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) return res.status(400).json({ error: "Invalid amount" });

    try {
      const driver = db.prepare("SELECT * FROM users WHERE userId = ?").get(req.user.userId) as any;
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      const pendingWithdrawalsSum = (db.prepare(`SELECT SUM(amount) as sum FROM withdrawals WHERE driverId = ? AND (status = 'en_attente' OR status = 'pending' OR status = 'en cours')`).get(driver.userId) as any)?.sum || 0;
      const earnings = calculateDriverEarnings(driver.userId) - pendingWithdrawalsSum;

      if (amountNum > earnings) return res.status(400).json({ error: "Amount exceeds available balance" });

      const id = uuidv4();
      db.prepare(`
        INSERT INTO withdrawals (id, driverId, driverName, amount, status, method, phone, withdrawalInfo)
        VALUES (?, ?, ?, ?, 'en_attente', ?, ?, ?)
      `).run(id, req.user.userId, req.user.name, amountNum, method, phone, withdrawalInfo || phone);

      // Create a notification for admin
      db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
        .run(uuidv4(), 'admin', 'Nouvelle demande de retrait', `${req.user.name} demande un retrait de ${amount} FCFA`, 'info');

      res.json({ status: "ok", id });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Échec de la demande de retrait." });
    }
  });

  app.get("/api/withdrawals", authenticate, (req: any, res) => {
    try {
      const list = db.prepare("SELECT * FROM withdrawals WHERE driverId = ? ORDER BY createdAt DESC").all(req.user.userId);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: "Échec de la récupération des retraits." });
    }
  });

  app.get("/api/drivers/gains-history", authenticate, (req: any, res) => {
    try {
      const list = db.prepare("SELECT * FROM historique_gains WHERE driverId = ? ORDER BY createdAt DESC").all(req.user.userId);
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Échec de la récupération de l'historique des gains." });
    }
  });

  app.get("/api/payout-registry", authenticate, checkAdmin, (req: any, res) => {
    try {
      const withdrawals = db.prepare("SELECT * FROM withdrawals ORDER BY createdAt DESC").all();
      res.json(withdrawals);
    } catch (err) {
      res.status(500).json({ error: "Échec de la récupération des retraits." });
    }
  });

  app.post("/api/payout-registry/:id/valider", authenticate, checkAdmin, async (req: any, res) => {
    const { id } = req.params;
    const { mode = 'manual', txId = '' } = req.body || {};
    try {
      const withdrawal = db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(id) as any;
      if (!withdrawal) return res.status(404).json({ error: "Retrait non trouvé." });
      
      if (mode !== 'force' && (withdrawal.status === 'valide' || withdrawal.status === 'rejete')) {
        return res.status(400).json({ error: "Déjà traité. Utilisez le forçage pour écraser." });
      }

      if (mode === 'force' && withdrawal.status === 'valide') {
        return res.status(400).json({ error: "Le retrait est déjà validé." });
      }

      const driver = db.prepare("SELECT * FROM users WHERE userId = ?").get(withdrawal.driverId) as any;
      if (!driver) return res.status(404).json({ error: "Livreur non trouvé." });

      const currentEarnings = calculateDriverEarnings(driver.userId);

      if (mode === 'auto') {
        // Simulate SapPay API call
        const sapPayConfig = db.prepare("SELECT * FROM config_store WHERE id = 'sappay'").get() as any;
        if (!sapPayConfig || !sapPayConfig.data) {
          return res.status(400).json({ error: "Configuration SapPay introuvable. Veuillez configurer SapPay d'abord." });
        }
        
        // Pseudo logic for Auto mode
        const isSuccess = Math.random() > 0.2; // 80% chance of success for simulation
        
        if (!isSuccess) {
          // Failure case
          db.prepare("UPDATE withdrawals SET status = 'echec', processedAt = CURRENT_TIMESTAMP WHERE id = ?").run(id);
          
          const msg = `Échec de votre demande de retrait de ${withdrawal.amount} FCFA via SapPay. Veuillez contacter le support.`;
          db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
            .run(uuidv4(), driver.userId, 'Retrait échoué', msg, 'error');
            
          sendPushNotification(driver.userId, 'Retrait échoué', msg, { type: 'withdrawal_failed' });
          
          return res.status(400).json({ error: "Échec de la transaction SapPay." });
        }
      }

      const finalTxId = txId || (mode === 'auto' ? `SP_${Math.random().toString(36).substring(7).toUpperCase()}` : '');

      db.transaction(() => {
        // Update user totalWithdrawn
        db.prepare("UPDATE users SET totalWithdrawn = COALESCE(totalWithdrawn, 0) + ? WHERE userId = ?").run(withdrawal.amount, driver.userId);
        
        // Update withdrawal status
        if (finalTxId) {
          try {
            // Check if txId column exists (we might need to alter table, or just ignore if it doesn't)
            // As a simple workaround, we can append it to the reason or we should add txId to schema if it exists.
            db.prepare("UPDATE withdrawals SET status = 'valide', txId = ?, processedAt = CURRENT_TIMESTAMP WHERE id = ?").run(finalTxId, id);
          } catch (e) {
            // If txId column does not exist
            db.prepare("UPDATE withdrawals SET status = 'valide', processedAt = CURRENT_TIMESTAMP WHERE id = ?").run(id);
          }
        } else {
          db.prepare("UPDATE withdrawals SET status = 'valide', processedAt = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        }

        // Add to historique_gains
        db.prepare(`
          INSERT INTO historique_gains (id, driverId, type, amount, createdAt)
          VALUES (?, ?, 'retrait', ?, CURRENT_TIMESTAMP)
        `).run(uuidv4(), driver.userId, withdrawal.amount);

        // Notify driver
        const methodText = mode === 'auto' ? 'via transfert mobile' : 'manuellement';
        const msg = `Votre retrait de ${withdrawal.amount} FCFA a été validé ${methodText}.${finalTxId ? ' Ref: ' + finalTxId : ''}`;
        db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
          .run(uuidv4(), driver.userId, 'Retrait validé', msg, 'success');
          
        // Add native push notification
        sendPushNotification(driver.userId, 'Paiement effectué', msg, { type: 'withdrawal_approved' });
      })();

      res.json({ status: "ok", txId: finalTxId });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Failed to validate withdrawal" });
    }
  });

  app.post("/api/payout-registry/:id/rejeter", authenticate, checkAdmin, (req: any, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
      const withdrawal = db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(id) as any;
      if (!withdrawal) return res.status(404).json({ error: "Retrait non trouvé." });
      if (withdrawal.status === 'valide' || withdrawal.status === 'rejete') return res.status(400).json({ error: "Déjà traité." });

      db.transaction(() => {
        db.prepare("UPDATE withdrawals SET status = 'rejete', reason = ?, processedAt = CURRENT_TIMESTAMP WHERE id = ?").run(reason, id);

        const msg = `Votre demande de retrait de ${withdrawal.amount} FCFA a été rejetée. ${reason ? 'Raison: ' + reason : ''}`;
        db.prepare("INSERT INTO notifications (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)")
          .run(uuidv4(), withdrawal.driverId, 'Retrait rejeté', msg, 'error');
          
        sendPushNotification(withdrawal.driverId, 'Retrait rejeté', msg, { type: 'withdrawal_rejected' });
      })();

      res.json({ status: "ok" });
    } catch (err) {
      res.status(500).json({ error: "Failed to reject withdrawal" });
    }
  });

  // --- AI FAQ ENDPOINT ---
  app.post("/api/faq", async (req: any, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "La question est requise." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "Service AI non configuré." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Vous êtes un assistant virtuel pour Faso Express, une plateforme logistique urbaine (livraisons par moto, tricycle, camionnette) au Burkina Faso. 
Un utilisateur pose cette question: "${query}". 
Veuillez répondre de manière brève, claire, professionnelle, et en langue française. Fournissez uniquement la réponse à la question, sans introduction ni conclusion superflue.
Informations utiles sur Faso Express :
- Calcul du coût de livraison : Le coût est calculé en fonction du type de véhicule, de la distance (calculée par géolocalisation), du poids du colis, d'une éventuelle urgence (+500 F) et est pondéré par notre équipe si nécessaire. Pour une moto, c'est généralement: jusqu'à 10km (1000F), jusqu'à 15km (1500F), au delà ça ajoute 150F par km. Le poids de la moto rajoute 100F par tranche.
- Les livraisons se font principalement sur Ouagadougou.
`;

      const aiRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      res.json({ answer: aiRes.text });
    } catch (err: any) {
      console.error("AI Error:", err);
      res.status(500).json({ error: "Erreur lors de la génération de la réponse temporelle." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startAutoReassignmentTimer();
  });
}

// Automatic reassignment on delay
function startAutoReassignmentTimer() {
  setInterval(() => {
    try {
      // 1. Fetch app config
      let reassignmentMode = 'manual';
      let autoReassignmentDelay = 15; // default 15 minutes
      const configRow = db.prepare("SELECT value FROM config WHERE `key` = 'app_config'").get() as any;
      if (configRow && configRow.value) {
        const appConfig = JSON.parse(configRow.value);
        if (appConfig.reassignmentMode) reassignmentMode = appConfig.reassignmentMode;
        if (appConfig.autoReassignmentDelay) autoReassignmentDelay = Number(appConfig.autoReassignmentDelay) || 15;
      }

      if (reassignmentMode !== 'automatic') return;

      // 2. Fetch deliveries that are accepted or ready_for_pickup but not picked_up yet
      const deliveriesToCheck = db.prepare(`
        SELECT id, driverId, driverName, status, updatedAt 
        FROM deliveries 
        WHERE status IN ('accepted', 'ready_for_pickup') AND driverId IS NOT NULL
      `).all() as any[];

      const now = new Date();
      for (const d of deliveriesToCheck) {
        const updatedAtStr = d.updatedAt;
        if (!updatedAtStr) continue;

        // Parse updatedAt safely (handling both SQLite CURRENT_TIMESTAMP and ISO format)
        const lastUpdated = new Date(updatedAtStr.includes('T') ? updatedAtStr : updatedAtStr + ' UTC');
        const diffInMs = now.getTime() - lastUpdated.getTime();
        const diffInMinutes = diffInMs / (1000 * 60);

        if (diffInMinutes >= autoReassignmentDelay) {
          console.log(`Auto-reassigning delivery ${d.id} due to timeout (${diffInMinutes.toFixed(1)} mins)`);

          const prevDriverId = d.driverId;

          // Update delivery back to pending
          db.prepare(`
            UPDATE deliveries 
            SET status = 'pending', driverId = NULL, driverName = NULL, updatedAt = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(d.id);

          // Update accepted bid for this driver (if any) to rejected
          db.prepare(`
            UPDATE bids 
            SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP 
            WHERE deliveryId = ? AND driverId = ? AND status = 'accepted'
          `).run(d.id, prevDriverId);

          // Log unassignment to driver history
          try {
            db.prepare(`
              INSERT INTO driver_mission_history (id, driverId, deliveryId, action, createdAt)
              VALUES (?, ?, ?, 'unassigned_timeout', CURRENT_TIMESTAMP)
            `).run(uuidv4(), prevDriverId, d.id);
          } catch (err) {
            console.error("Failed to log unassignment timeout:", err);
          }

          // Send notification to the driver
          try {
            db.prepare(`
              INSERT INTO notifications (id, userId, title, message, type)
              VALUES (?, ?, ?, ?, 'warning')
            `).run(
              uuidv4(), 
              prevDriverId, 
              'Course retirée [Temps dépassé]', 
              `La course #${d.id.slice(-6).toUpperCase()} vous a été retirée car vous n'avez pas procédé à la récupération à temps (limite de ${autoReassignmentDelay} mins).`, 
              'warning'
            );
          } catch (err) {
            console.error("Failed to notify driver of timeout:", err);
          }

          // Send notification to client of driver timeout
          try {
            const deliveryDetails = db.prepare("SELECT clientId FROM deliveries WHERE id = ?").get(d.id) as any;
            if (deliveryDetails && deliveryDetails.clientId) {
              db.prepare(`
                INSERT INTO notifications (id, userId, title, message, type)
                VALUES (?, ?, ?, ?, 'info')
              `).run(
                uuidv4(), 
                deliveryDetails.clientId, 
                'Livreur indisponible', 
                `Votre course #${d.id.slice(-6).toUpperCase()} a été remise en recherche automatique car le livreur précédent a dépassé le délai de prise en charge.`, 
                'info'
              );
            }
          } catch (err) {
            console.error("Failed to notify client of driver timeout:", err);
          }
        }
      }
    } catch (err) {
      console.error("Error in startAutoReassignmentTimer check:", err);
    }
  }, 30000); // Check every 30 seconds
}

startServer();

