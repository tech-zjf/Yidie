/** Small SQL boundary shared by the Expo adapter and real SQLite integration tests. */
export type SqlValue = string | number | null;
export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlValue[]): Promise<{ changes: number }>;
  getFirstAsync<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
}
export type WriteTransaction = <T>(action: (tx: SqlDatabase) => Promise<T>) => Promise<T>;
