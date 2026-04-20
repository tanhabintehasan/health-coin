#!/usr/bin/env node
/**
 * HealthCoin Admin Setup Script
 * 
 * Creates or updates an admin user with a specific phone and password.
 * 
 * Usage from project root:
 *   cd C:\healthcoin
 *   node scripts/setup-admin.js
 * 
 * Or with custom credentials:
 *   ADMIN_PHONE=13800138000 ADMIN_PASSWORD=mypass node scripts/setup-admin.js
 */

const path = require('path');
const fs = require('fs');

// Load .env from apps/api/.env
const envPath = path.resolve(__dirname, '../apps/api/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0 && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
  console.log('📄 Loaded environment from apps/api/.env');
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { customAlphabet } = require('nanoid');

const TARGET_PHONE = process.env.ADMIN_PHONE;
const TARGET_PASSWORD = process.env.ADMIN_PASSWORD;
const TARGET_NICKNAME = process.env.ADMIN_NICKNAME || 'Administrator';

if (!TARGET_PHONE || !TARGET_PASSWORD) {
  console.error('❌ ADMIN_PHONE and ADMIN_PASSWORD environment variables are required');
  console.error('Example: set ADMIN_PHONE=13800138000 && set ADMIN_PASSWORD=YourSecurePassword123 && node scripts/setup-admin.js');
  process.exit(1);
}

async function main() {
  console.log('');
  console.log('🔧 HealthCoin Admin Setup');
  console.log('==========================');
  console.log(`Phone:    ${TARGET_PHONE}`);
  console.log(`Nickname: ${TARGET_NICKNAME}`);
  console.log('');

  const prisma = new PrismaClient();

  try {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { phone: TARGET_PHONE },
    });

    // Hash password
    const passwordHash = await bcrypt.hash(TARGET_PASSWORD, 12);

    if (user) {
      console.log('👤 User already exists. Updating password and role...');
      
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: passwordHash,
          nickname: TARGET_NICKNAME,
          isActive: true,
        },
      });
      console.log('✅ User updated with new password.');
    } else {
      console.log('👤 Creating new admin user...');
      
      const generateReferralCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);
      let referralCode = generateReferralCode();
      let attempts = 0;
      while (attempts < 100) {
        const existing = await prisma.user.findUnique({ where: { referralCode } });
        if (!existing) break;
        referralCode = generateReferralCode();
        attempts++;
      }

      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            phone: TARGET_PHONE,
            password: passwordHash,
            nickname: TARGET_NICKNAME,
            referralCode,
            membershipLevel: 1,
            isActive: true,
          },
        });

        await tx.wallet.createMany({
          data: [
            { userId: newUser.id, walletType: 'HEALTH_COIN', balance: 0n },
            { userId: newUser.id, walletType: 'MUTUAL_HEALTH_COIN', balance: 0n },
            { userId: newUser.id, walletType: 'UNIVERSAL_HEALTH_COIN', balance: 0n },
          ],
        });

        return newUser;
      });

      console.log('✅ User created with 3 wallets.');
    }

    // Ensure admin role
    const adminRole = await prisma.adminUser.findUnique({
      where: { userId: user.id },
    });

    if (adminRole) {
      if (!adminRole.isActive) {
        await prisma.adminUser.update({
          where: { userId: user.id },
          data: { isActive: true },
        });
        console.log('✅ Admin role reactivated.');
      } else {
        console.log('👑 Admin role already active.');
      }
    } else {
      await prisma.adminUser.create({
        data: {
          userId: user.id,
          role: 'SUPER_ADMIN',
          permissions: [],
          isActive: true,
        },
      });
      console.log('✅ Admin role (SUPER_ADMIN) assigned.');
    }

    console.log('');
    console.log('🎉 Admin setup complete!');
    console.log('');
    console.log('Login credentials:');
    console.log(`  Phone:    ${TARGET_PHONE}`);
    console.log(`  Password: ${TARGET_PASSWORD}`);
    console.log('');
    console.log('You can now login at: http://YOUR_SERVER_IP/login');
    console.log('  → Use "密码登录" (Password Login) tab');
    console.log('  → Or use "验证码登录" (OTP Login) if SMS is configured');

  } catch (err) {
    console.error('');
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
