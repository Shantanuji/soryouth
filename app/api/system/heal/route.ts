import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const log: string[] = [];

  try {
    if (process.platform === 'linux') {
      // 1. Permissions
      try {
        execSync('chmod -R 755 /var/www/soryouth-crm 2>/dev/null || true');
        execSync('chmod -R 777 /var/www/soryouth-crm/.next /var/www/soryouth-crm/public /var/www/soryouth-crm/prisma 2>/dev/null || true');
        execSync('chmod 666 /var/www/soryouth-crm/prisma/dev.db 2>/dev/null || true');
        log.push('✅ Permissions fixed (777 on .next, public, prisma and 666 on dev.db)');
      } catch (e: any) {
        log.push(`⚠️ Permission fix notice: ${e.message}`);
      }

      // 2. Nginx reload
      try {
        execSync('nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true');
        log.push('✅ Nginx configuration tested and reloaded');
      } catch (e: any) {
        log.push(`⚠️ Nginx reload notice: ${e.message}`);
      }

      // 3. SSH Keys
      try {
        const sshDir = '/root/.ssh';
        const authKeysFile = path.join(sshDir, 'authorized_keys');
        if (!fs.existsSync(sshDir)) {
          fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 });
        } else {
          fs.chmodSync(sshDir, 0o700);
        }

        const ed25519Key = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFgLsjeeDXzwZJin3HuAeegAH61nScf5fbLIeqzOC1rh soryouth-crm-server';
        const rsaKey = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDqyWQnOQBExaKgCgOaK3DUXcdslNjUgUYvRyjYFgYsducwrnQT35ba1Th/gcymIpwqYxmFi1wswFotIMLeb+SKHzTBwjCxP5FXozxM9KsyOIvznvTwNUdat7JhTX2gRmXjmCVa4nStR55cUZimOYqQNruXFeZvfvJg4cLuyI1qA0D/99mF9rQpFPz+dxxLvqRHfNRxxvnfEelmBZk2jCyyU35wl0xiLVB3MbquNQpiwldfLnQ0euQRcYoY7Tli9Uk6wsn+4rmNlcqOJWOqP7KjE0HQfEXQInYJgKAIL1hBN2EimNleAXf+/s9CxJhqGfo3BWZtSvcQM4Ll+OmzrXwKUoPo3rg4Y+/0Kp/JbcOjFtRGDS6hUKwZvNk5LnzABlqTZSki2mLLc0HpGI9hRBs0mZv5ytZoTIr6Th6A5EOjOCAn7zIZeCxw/90JjYqD1DoBYudIpmED90x5EklJ9Z8JGtztIOO6QjQJCPBge/4ds1WQ3RZDTtncMaBIX/S9yEDQQrfSZPXObkvqOIqG6ssgi5tlKm2PQ+sjTAqmYywt8BncbxXgn378ptH3oxzETbScIVmfQSrwDFZceW/yV0F//rVw5JUjDbylKgcqDBRvBHFjuZFGkjB6KWPODEWoZ1ym1HvhS/vaVCxJYzXNuGrwmtBWg/5qdJdQY/j1umxINQ== soryouth-crm-rsa';

        let existingContent = '';
        if (fs.existsSync(authKeysFile)) {
          existingContent = fs.readFileSync(authKeysFile, 'utf8');
        }

        if (!existingContent.includes(ed25519Key)) {
          existingContent += `\n${ed25519Key}\n`;
        }
        if (!existingContent.includes('soryouth-crm-rsa')) {
          existingContent += `\n${rsaKey}\n`;
        }

        fs.writeFileSync(authKeysFile, existingContent.trim() + '\n', { mode: 0o600 });
        fs.chmodSync(authKeysFile, 0o600);

        execSync("sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/g' /etc/ssh/sshd_config 2>/dev/null || true");
        execSync("sed -i 's/PubkeyAuthentication no/PubkeyAuthentication yes/g' /etc/ssh/sshd_config 2>/dev/null || true");
        execSync("sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/g' /etc/ssh/sshd_config 2>/dev/null || true");
        execSync("systemctl reload ssh sshd 2>/dev/null || true");
        log.push('✅ SSH keys configured and sshd reloaded');
      } catch (e: any) {
        log.push(`⚠️ SSH key setup notice: ${e.message}`);
      }
    } else {
      log.push('ℹ️ Running on non-Linux platform (development environment)');
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      log,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 });
  }
}
