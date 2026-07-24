#!/bin/bash

# Configuration
DB_FILE="/var/www/soryouth-crm/prisma/dev.db"
BACKUP_DIR="/var/www/soryouth-crm/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/dev_db_backup_${TIMESTAMP}.sqlite3"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting database backup at $(date)..."

# Safely copy/snapshot the database
if command -v sqlite3 &> /dev/null; then
    # Safely creates a backup even if the database is actively being written to
    sqlite3 "${DB_FILE}" ".backup '${BACKUP_FILE}'"
else
    # Fallback to standard copy if sqlite3 CLI utility is not installed
    cp "${DB_FILE}" "${BACKUP_FILE}"
fi

# Compress the backup to save space
gzip "${BACKUP_FILE}"

# Automatically delete backups older than 30 days to save disk space
find "${BACKUP_DIR}" -name "dev_db_backup_*.sqlite3.gz" -mtime +30 -exec rm {} \;

echo "Backup complete: ${BACKUP_FILE}.gz"
