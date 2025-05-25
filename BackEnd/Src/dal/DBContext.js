import mssql from 'mssql';
const { ConnectionPool } = mssql;

class DBContext {
    constructor() {
        const config = {
            user: 'dat',
            password: '123',
            server: 'localhost',
            database: 'SWP391',
            options: {
                encrypt: true,
                trustServerCertificate: true
            }
        };

        this.pool = new ConnectionPool(config)
            .connect()
            .then(pool => {
                console.log('Database connected successfully!');
                return pool;
            })
            .catch(err => {
                throw new Error(' Database connection failed: ' + err.message);
            });
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
