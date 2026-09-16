import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';

export function openDatabase(filename) {
  const database=new DatabaseSync(filename);
  database.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  for(const file of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort()) {
    if(database.prepare('SELECT name FROM local_migrations WHERE name=?').get(file)) continue;
    database.exec('BEGIN IMMEDIATE');
    try {
      database.exec(fs.readFileSync('drizzle/'+file,'utf8'));
      database.prepare('INSERT INTO local_migrations VALUES (?)').run(file);
      database.exec('COMMIT');
    } catch(error) { database.exec('ROLLBACK'); throw error; }
  }
  class Statement {
    constructor(sql,args=[]) {this.sql=sql;this.args=args;}
    bind(...args) {return new Statement(this.sql,args);}
    all() {return {results:database.prepare(this.sql).all(...this.args)};}
    first() {return database.prepare(this.sql).get(...this.args)||null;}
    run() {return database.prepare(this.sql).run(...this.args);}
  }
  return {
    prepare:sql=>new Statement(sql),
    batch(items) {
      // Keep the whole synchronous SQLite transaction in one event-loop turn.
      database.exec('BEGIN IMMEDIATE');
      try {const results=items.map(item=>item.run());database.exec('COMMIT');return results;}
      catch(error) {database.exec('ROLLBACK');throw error;}
    },
    close:()=>database.close()
  };
}
