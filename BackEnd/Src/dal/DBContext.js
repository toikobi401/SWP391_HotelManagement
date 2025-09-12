import mssql from 'mssql';
const { ConnectionPool } = mssql;

let pool = null; 

class DBContext {
    constructor() {
        if (!pool) {
            const config = {
                user: process.env.DB_USER || 'dat',
                password: process.env.DB_PASSWORD || '123',
                server: process.env.DB_HOST || 'localhost',
                database: process.env.DB_NAME || 'SWP391',
                options: {
                    encrypt: false, // Thay đổi từ true thành false cho local SQL Server
                    trustServerCertificate: true,
                    enableArithAbort: true
                },
                pool: {
                    max: 10,
                    min: 0,
                    idleTimeoutMillis: 30000
                }
            };

            console.log('Database config:', {
                server: config.server,
                database: config.database,
                user: config.user
            });

            pool = new ConnectionPool(config)
                .connect()
                .then(p => {
                    console.log('✅ Database connected successfully!');
                    return p;
                })
                .catch(err => {
                    console.error('❌ Database connection failed:', err);
                    throw new Error('Database connection failed: ' + err.message);
                });
        }

        this.pool = pool;
    }

    // ✅ THÊM: Query method để execute SQL queries
    async query(sql, parameters = []) {
        try {
            const poolConnection = await this.pool;
            const request = poolConnection.request();
            
            // Add parameters to request
            if (parameters && parameters.length > 0) {
                parameters.forEach(param => {
                    request.input(param.name, param.type, param.value);
                });
            }
            
            const result = await request.query(sql);
            return result;
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        }
    }

    async list() {
        throw new Error('Method "list()" must be implemented');
    }

    async get(id) {
        throw new Error('Method "get(id)" must be implemented');
    }

    async insert(model) {
        throw new Error('Method "insert(model)" must be implemented');
    }

    async update(model) {
        throw new Error('Method "update(model)" must be implemented');
    }

    async delete(model) {
        throw new Error('Method "delete(model)" must be implemented');
    }
}

export default DBContext;