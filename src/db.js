import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

/** Runs fn inside a transaction and always releases the connection. */
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
