// Built-in SQLite avoids native compiler requirements on presentation machines.
// Requires Node.js 22.13+ (Node.js 24 LTS recommended).
const { DatabaseSync } = require('node:sqlite');
module.exports = class Database {
  constructor(filename) { this.db = new DatabaseSync(filename); }
  prepare(sql) {
    const statement = this.db.prepare(sql);
    const clean = args => args.map(v => v === undefined ? null : typeof v === 'boolean' ? Number(v) : v);
    return { run: (...args) => statement.run(...clean(args)), get: (...args) => statement.get(...clean(args)), all: (...args) => statement.all(...clean(args)) };
  }
  exec(sql) { return this.db.exec(sql); }
  pragma(sql) { return this.db.prepare(`PRAGMA ${sql}`).all(); }
  transaction(fn) {
    return (...args) => {
      this.db.exec('BEGIN IMMEDIATE');
      try { const result = fn(...args); this.db.exec('COMMIT'); return result; }
      catch (error) { this.db.exec('ROLLBACK'); throw error; }
    };
  }
  close() { this.db.close(); }
};
