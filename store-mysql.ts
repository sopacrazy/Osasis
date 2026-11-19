import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2/promise';
import crypto from 'node:crypto';
import { DuplicateUserError, type CampaignData, type Session, type Store, type User } from './store.ts';

/** Implementação MariaDB/MySQL. Conecta com um usuário que só enxerga o banco do RPG. */
export function createMysqlStore(): Store {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'rpg_cronica',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 10000,
  });

  type Row = RowDataPacket;
  const toUser = (r: Row): User => ({
    id: r.id,
    username: r.username,
    passHash: r.pass_hash,
    createdAt: new Date(r.created_at).toISOString(),
    disabled: Boolean(r.disabled),
  });

  return {
    kind: 'mysql',

    async init() {
      const opts = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
      await pool.query(`CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) NOT NULL PRIMARY KEY,
        username VARCHAR(32) NOT NULL,
        pass_hash VARCHAR(255) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        disabled TINYINT(1) NOT NULL DEFAULT 0,
        UNIQUE KEY uq_users_username (username)
      ) ${opts}`);
      await pool.query(`CREATE TABLE IF NOT EXISTS sessions (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        KEY idx_sessions_user (user_id),
        KEY idx_sessions_exp (expires_at),
        CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ${opts}`);
      await pool.query(`CREATE TABLE IF NOT EXISTS campaigns (
        user_id CHAR(36) NOT NULL,
        id VARCHAR(80) NOT NULL,
        data LONGTEXT NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (user_id, id),
        CONSTRAINT fk_campaigns_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ${opts}`);
      await pool.query('DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
    },

    users: {
      async byName(name) {
        const [rows] = await pool.query<Row[]>('SELECT * FROM users WHERE username = ? LIMIT 1', [name.toLowerCase()]);
        return rows[0] ? toUser(rows[0]) : undefined;
      },
      async byId(id) {
        const [rows] = await pool.query<Row[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
        return rows[0] ? toUser(rows[0]) : undefined;
      },
      async list() {
        const [rows] = await pool.query<Row[]>('SELECT * FROM users ORDER BY created_at');
        return rows.map(toUser);
      },
      async create(username, passHash) {
        const user: User = {
          id: crypto.randomUUID(),
          username: username.toLowerCase(),
          passHash,
          createdAt: new Date().toISOString(),
        };
        try {
          await pool.query('INSERT INTO users (id, username, pass_hash, created_at) VALUES (?, ?, ?, ?)', [
            user.id,
            user.username,
            user.passHash,
            new Date(user.createdAt),
          ]);
        } catch (err) {
          if ((err as { code?: string }).code === 'ER_DUP_ENTRY') throw new DuplicateUserError();
          throw err;
        }
        return user;
      },
      async setPassword(id, passHash) {
        const [res] = await pool.query<mysql.ResultSetHeader>('UPDATE users SET pass_hash = ? WHERE id = ?', [passHash, id]);
        return res.affectedRows > 0;
      },
      async remove(id) {
        await pool.query('DELETE FROM users WHERE id = ?', [id]); // sessões e campanhas saem em cascata
      },
    },

    sessions: {
      async create(tokenHash, s: Session) {
        await pool.query('DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
        await pool.query('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [
          tokenHash,
          s.userId,
          s.createdAt,
          s.expiresAt,
        ]);
      },
      async get(tokenHash) {
        const [rows] = await pool.query<Row[]>(
          'SELECT user_id, created_at, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1',
          [tokenHash, Date.now()],
        );
        const r = rows[0];
        return r ? { userId: r.user_id, createdAt: Number(r.created_at), expiresAt: Number(r.expires_at) } : undefined;
      },
      async remove(tokenHash) {
        await pool.query('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
      },
      async removeForUser(userId, exceptHash) {
        await pool.query('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?', [userId, exceptHash ?? '']);
      },
    },

    campaigns: {
      async list(userId) {
        const [rows] = await pool.query<Row[]>('SELECT data FROM campaigns WHERE user_id = ?', [userId]);
        const out: CampaignData[] = [];
        for (const r of rows) {
          try {
            out.push(JSON.parse(r.data) as CampaignData);
          } catch {
            // registro corrompido: ignora
          }
        }
        return out;
      },
      async count(userId) {
        const [rows] = await pool.query<Row[]>('SELECT COUNT(*) AS n FROM campaigns WHERE user_id = ?', [userId]);
        return Number(rows[0]?.n ?? 0);
      },
      async exists(userId, id) {
        const [rows] = await pool.query<Row[]>('SELECT 1 FROM campaigns WHERE user_id = ? AND id = ? LIMIT 1', [userId, id]);
        return rows.length > 0;
      },
      async save(userId, id, campaign) {
        await pool.query(
          `INSERT INTO campaigns (user_id, id, data, updated_at) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)`,
          [userId, id, JSON.stringify(campaign), new Date()],
        );
      },
      async remove(userId, id) {
        await pool.query('DELETE FROM campaigns WHERE user_id = ? AND id = ?', [userId, id]);
      },
    },
  };
}
