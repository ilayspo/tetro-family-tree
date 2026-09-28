import pg from 'pg';
const connectionString=process.env.DATABASE_URL?.replace(/([?&])sslmode=(?:prefer|require|verify-ca)(?=&|$)/,'$1sslmode=verify-full');
const pool = new pg.Pool({connectionString,ssl:{rejectUnauthorized:true},max:4});
export const query=(sql,params)=>pool.query(sql,params);
export async function transaction(fn){const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
