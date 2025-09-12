import sql from 'mssql';
import DBContext from './DBContext.js';
import Service from '../model/Service.js';

class ServiceDBContext extends DBContext {
    // ✅ THÊM: Method mới với pagination thực sự
    async getAllWithPagination({
        page = 1,
        limit = 10,
        offset = 0,
        search = '',
        category = '',
        isActive = '',
        sortBy = 'ServiceName',
        sortOrder = 'asc'
    }) {
        try {
            const pool = await this.pool;
            
            // Build WHERE clause
            let whereConditions = [];
            let queryParams = [];
            
            if (search && search.trim()) {
                whereConditions.push(`(s.ServiceName LIKE @search OR s.Description LIKE @search)`);
                queryParams.push({ name: 'search', type: sql.NVarChar, value: `%${search.trim()}%` });
            }
            
            if (category && category !== 'all') {
                whereConditions.push(`s.Category = @category`);
                queryParams.push({ name: 'category', type: sql.NVarChar, value: category });
            }
            
            if (isActive !== '') {
                const activeValue = isActive === 'true';
                whereConditions.push(`s.IsActive = @isActive`);
                queryParams.push({ name: 'isActive', type: sql.Bit, value: activeValue });
            }
            
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            
            // Validate sortBy
            const allowedSortColumns = ['ServiceName', 'Price', 'Category', 'CreateAt', 'Duration', 'MaxCapacity'];
            const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'ServiceName';
            const safeSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
            
            // ✅ QUAN TRỌNG: Get total count TRƯỚC
            const countQuery = `
                SELECT COUNT(*) as totalCount
                FROM Service s
                ${whereClause}
            `;
            
            const countRequest = pool.request();
            queryParams.forEach(param => {
                countRequest.input(param.name, param.type, param.value);
            });
            
            const countResult = await countRequest.query(countQuery);
            const totalCount = countResult.recordset[0].totalCount;
            
            // ✅ QUAN TRỌNG: Get paginated data với OFFSET và FETCH NEXT
            const dataQuery = `
                SELECT s.*,
                       COUNT(bs.BookingID) as BookingCount,
                       COALESCE(SUM(CASE WHEN bs.ServiceID IS NOT NULL THEN 1 ELSE 0 END), 0) as TotalBookings
                FROM Service s
                LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                ${whereClause}
                GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                         s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                         s.CreateAt, s.UpdateAt
                ORDER BY s.${safeSortBy} ${safeSortOrder}
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `;
            
            const dataRequest = pool.request();
            queryParams.forEach(param => {
                dataRequest.input(param.name, param.type, param.value);
            });
            dataRequest.input('offset', sql.Int, offset);
            dataRequest.input('limit', sql.Int, limit);
            
            console.log('🔍 Executing paginated query:', {
                offset, limit, totalCount, query: dataQuery
            });
            
            const dataResult = await dataRequest.query(dataQuery);
            
            const services = dataResult.recordset.map(record => {
                const service = Service.fromDatabase(record);
                service.bookingCount = record.BookingCount || 0;
                service.totalBookings = record.TotalBookings || 0;
                return service;
            });
            
            const totalPages = Math.ceil(totalCount / limit);
            
            console.log('✅ Pagination result:', {
                services: services.length,
                totalCount,
                totalPages,
                currentPage: page
            });
            
            return {
                success: true,
                data: services,
                pagination: {
                    currentPage: page,
                    pageSize: limit,
                    totalCount,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    startIndex: offset + 1,
                    endIndex: Math.min(offset + limit, totalCount)
                }
            };
            
        } catch (error) {
            console.error('❌ Error getting services with pagination:', error);
            return {
                success: false,
                message: `Lỗi khi lấy danh sách dịch vụ: ${error.message}`,
                data: [],
                pagination: null
            };
        }
    }

    // ✅ GIỮ NGUYÊN: Method cũ cho backward compatibility
    async getAll() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT s.*, 
                           COUNT(bs.BookingID) as BookingCount,
                           COALESCE(SUM(CASE WHEN bs.ServiceID IS NOT NULL THEN 1 ELSE 0 END), 0) as TotalBookings
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                             s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                             s.CreateAt, s.UpdateAt
                    ORDER BY s.ServiceName
                `);

            return result.recordset.map(record => {
                const service = Service.fromDatabase(record);
                service.bookingCount = record.BookingCount || 0;
                service.totalBookings = record.TotalBookings || 0;
                return service;
            });
        } catch (error) {
            console.error('❌ Error getting all services:', error);
            throw new Error(`Lỗi khi lấy danh sách dịch vụ: ${error.message}`);
        }
    }

    // Get service by ID
    async getById(serviceId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('ServiceID', sql.Int, serviceId)
                .query(`
                    SELECT s.*,
                           COUNT(bs.BookingID) as BookingCount,
                           SUM(bs.ServiceID) as TotalBookings
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    WHERE s.ServiceID = @ServiceID
                    GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                             s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                             s.CreateAt, s.UpdateAt
                `);
            
            if (result.recordset.length === 0) {
                return null;
            }

            const service = Service.fromDatabase(result.recordset[0]);
            service.bookingCount = result.recordset[0].BookingCount || 0;
            service.totalBookings = result.recordset[0].TotalBookings || 0;
            
            return service;
        } catch (error) {
            console.error(`Error getting service ${serviceId}:`, error);
            throw error;
        }
    }

    // Insert new service
    async insert(service) {
        try {
            const validation = service.validate();
            if (!validation.isValid) {
                throw new Error('Validation failed: ' + validation.errors.join(', '));
            }

            const pool = await this.pool;
            const result = await pool.request()
                .input('ServiceName', sql.NVarChar(50), service.ServiceName)
                .input('Description', sql.NVarChar(255), service.Description)
                .input('Price', sql.Float, service.Price)
                .input('Category', sql.NVarChar(100), service.Category) // ✅ SỬA: Category thay vì CategoryID
                .input('IsActive', sql.Bit, service.IsActive)
                .input('Image', sql.VarBinary(sql.MAX), service.Image) // ✅ THÊM: Image field
                .input('Duration', sql.Int, service.Duration) // ✅ THÊM: Duration field
                .input('MaxCapacity', sql.Int, service.MaxCapacity) // ✅ THÊM: MaxCapacity field
                .input('CreateAt', sql.DateTime, service.CreateAt)
                .input('UpdateAt', sql.DateTime, service.UpdateAt)
                .query(`
                    INSERT INTO Service (
                        ServiceName, Description, Price, Category, IsActive,
                        Image, Duration, MaxCapacity, CreateAt, UpdateAt
                    )
                    OUTPUT INSERTED.ServiceID
                    VALUES (
                        @ServiceName, @Description, @Price, @Category, @IsActive,
                        @Image, @Duration, @MaxCapacity, @CreateAt, @UpdateAt
                    )
                `);
            
            return result.recordset[0].ServiceID;
        } catch (error) {
            console.error('Error inserting service:', error);
            throw error;
        }
    }

    // Update service
    async update(service) {
        try {
            const validation = service.validate();
            if (!validation.isValid) {
                throw new Error('Validation failed: ' + validation.errors.join(', '));
            }

            const pool = await this.pool;
            const result = await pool.request()
                .input('ServiceID', sql.Int, service.ServiceID)
                .input('ServiceName', sql.NVarChar(50), service.ServiceName)
                .input('Description', sql.NVarChar(255), service.Description)
                .input('Price', sql.Float, service.Price)
                .input('Category', sql.NVarChar(100), service.Category) // ✅ SỬA: Category thay vì CategoryID
                .input('IsActive', sql.Bit, service.IsActive)
                .input('Image', sql.VarBinary(sql.MAX), service.Image) // ✅ THÊM: Image field
                .input('Duration', sql.Int, service.Duration) // ✅ THÊM: Duration field
                .input('MaxCapacity', sql.Int, service.MaxCapacity) // ✅ THÊM: MaxCapacity field
                .input('UpdateAt', sql.DateTime, new Date())
                .query(`
                    UPDATE Service SET
                        ServiceName = @ServiceName,
                        Description = @Description,
                        Price = @Price,
                        Category = @Category,
                        IsActive = @IsActive,
                        Image = @Image,
                        Duration = @Duration,
                        MaxCapacity = @MaxCapacity,
                        UpdateAt = @UpdateAt
                    WHERE ServiceID = @ServiceID
                `);
            
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error(`Error updating service ${service.ServiceID}:`, error);
            throw error;
        }
    }

    // ✅ THÊM: Get active services only
    async getActiveServices() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT s.*,
                           COUNT(bs.BookingID) as BookingCount
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    WHERE s.IsActive = 1
                    GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                             s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                             s.CreateAt, s.UpdateAt
                    ORDER BY s.ServiceName
                `);

            return result.recordset.map(record => {
                const service = Service.fromDatabase(record);
                service.bookingCount = record.BookingCount || 0;
                return service;
            });
        } catch (error) {
            console.error('❌ Error getting active services:', error);
            throw new Error(`Lỗi khi lấy danh sách dịch vụ hoạt động: ${error.message}`);
        }
    }

    // ✅ THÊM: Get services by category
    async getServicesByCategory(category) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('Category', sql.NVarChar(100), category)
                .query(`
                    SELECT s.*,
                           COUNT(bs.BookingID) as BookingCount
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    WHERE s.Category = @Category
                    GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                             s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                             s.CreateAt, s.UpdateAt
                    ORDER BY s.ServiceName
                `);

            return result.recordset.map(record => {
                const service = Service.fromDatabase(record);
                service.bookingCount = record.BookingCount || 0;
                return service;
            });
        } catch (error) {
            console.error(`❌ Error getting services by category ${category}:`, error);
            throw new Error(`Lỗi khi lấy dịch vụ theo danh mục: ${error.message}`);
        }
    }

    // ✅ THÊM: Search services by name
    async searchServicesByName(searchTerm) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('SearchTerm', sql.NVarChar(100), `%${searchTerm}%`)
                .query(`
                    SELECT s.*,
                           COUNT(bs.BookingID) as BookingCount
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    WHERE s.ServiceName LIKE @SearchTerm 
                       OR s.Description LIKE @SearchTerm
                       OR s.Category LIKE @SearchTerm
                    GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                             s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                             s.CreateAt, s.UpdateAt
                    ORDER BY s.ServiceName
                `);

            return result.recordset.map(record => {
                const service = Service.fromDatabase(record);
                service.bookingCount = record.BookingCount || 0;
                return service;
            });
        } catch (error) {
            console.error('❌ Error searching services by name:', error);
            throw new Error(`Lỗi khi tìm kiếm dịch vụ: ${error.message}`);
        }
    }

    // ✅ THÊM: Update service status
    async updateStatus(serviceId, isActive) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('ServiceID', sql.Int, serviceId)
                .input('IsActive', sql.Bit, isActive)
                .input('UpdateAt', sql.DateTime, new Date())
                .query(`
                    UPDATE Service 
                    SET IsActive = @IsActive, UpdateAt = @UpdateAt
                    WHERE ServiceID = @ServiceID
                `);
            
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error(`❌ Error updating service status ${serviceId}:`, error);
            throw new Error(`Lỗi khi cập nhật trạng thái dịch vụ: ${error.message}`);
        }
    }

    // ✅ THÊM: Check if service is in use
    async isServiceInUse(serviceId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('ServiceID', sql.Int, serviceId)
                .query(`
                    SELECT COUNT(*) as UsageCount
                    FROM BookingService bs
                    WHERE bs.ServiceID = @ServiceID
                `);
            
            return result.recordset[0].UsageCount > 0;
        } catch (error) {
            console.error('❌ Error checking service usage:', error);
            throw new Error(`Lỗi khi kiểm tra sử dụng dịch vụ: ${error.message}`);
        }
    }

    // ✅ THÊM: Get all categories
    async getAllCategories() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT DISTINCT Category
                    FROM Service
                    WHERE Category IS NOT NULL AND Category != ''
                    ORDER BY Category
                `);

            return result.recordset.map(record => record.Category);
        } catch (error) {
            console.error('❌ Error getting categories:', error);
            throw new Error(`Lỗi khi lấy danh sách danh mục: ${error.message}`);
        }
    }

    // Get services by duration range
    async getServicesByDuration(minDuration, maxDuration) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('MinDuration', sql.Int, minDuration)
                .input('MaxDuration', sql.Int, maxDuration)
                .query(`
                    SELECT s.*,
                           COUNT(bs.BookingID) as BookingCount,
                           SUM(bs.ServiceID) as TotalBookings
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    WHERE s.Duration BETWEEN @MinDuration AND @MaxDuration
                    GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                             s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                             s.CreateAt, s.UpdateAt
                    ORDER BY s.Duration ASC
                `);

            return result.recordset.map(record => {
                const service = Service.fromDatabase(record);
                service.bookingCount = record.BookingCount || 0;
                service.totalBookings = record.TotalBookings || 0;
                return service;
            });
        } catch (error) {
            console.error('Error getting services by duration range:', error);
            throw error;
        }
    }

    // Get services by capacity
    async getServicesByCapacity(minCapacity) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('MinCapacity', sql.Int, minCapacity)
                .query(`
                    SELECT s.*,
                           COUNT(bs.BookingID) as BookingCount,
                           SUM(bs.ServiceID) as TotalBookings
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    WHERE s.MaxCapacity >= @MinCapacity
                    GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                             s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                             s.CreateAt, s.UpdateAt
                    ORDER BY s.MaxCapacity ASC
                `);

            return result.recordset.map(record => {
                const service = Service.fromDatabase(record);
                service.bookingCount = record.BookingCount || 0;
                service.totalBookings = record.TotalBookings || 0;
                return service;
            });
        } catch (error) {
            console.error('Error getting services by capacity:', error);
            throw error;
        }
    }

    // Get all categories
    async getAllCategories() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT DISTINCT Category
                    FROM Service
                    WHERE Category IS NOT NULL AND Category != ''
                    ORDER BY Category
                `);

            return result.recordset.map(record => record.Category);
        } catch (error) {
            console.error('Error getting all categories:', error);
            throw error;
        }
    }

    // ✅ CẬP NHẬT: Các methods còn lại với schema mới
    async getActiveServices() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT s.*,
                           COUNT(bs.BookingID) as BookingCount,
                           SUM(bs.ServiceID) as TotalBookings
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    WHERE s.IsActive = 1
                    GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                             s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                             s.CreateAt, s.UpdateAt
                    ORDER BY s.ServiceName
                `);

            return result.recordset.map(record => {
                const service = Service.fromDatabase(record);
                service.bookingCount = record.BookingCount || 0;
                service.totalBookings = record.TotalBookings || 0;
                return service;
            });
        } catch (error) {
            console.error('Error getting active services:', error);
            throw error;
        }
    }

    // Search services by name
    async searchServicesByName(searchTerm) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('SearchTerm', sql.NVarChar(50), `%${searchTerm}%`)
                .query(`
                    SELECT s.*,
                           COUNT(bs.BookingID) as BookingCount,
                           SUM(bs.ServiceID) as TotalBookings
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    WHERE s.ServiceName LIKE @SearchTerm
                    GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                             s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                             s.CreateAt, s.UpdateAt
                    ORDER BY s.ServiceName
                `);

            return result.recordset.map(record => {
                const service = Service.fromDatabase(record);
                service.bookingCount = record.BookingCount || 0;
                service.totalBookings = record.TotalBookings || 0;
                return service;
            });
        } catch (error) {
            console.error('Error searching services by name:', error);
            throw error;
        }
    }

    // Update service status (active/inactive)
    async updateStatus(serviceId, isActive) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('ServiceID', sql.Int, serviceId)
                .input('IsActive', sql.Bit, isActive)
                .input('UpdateAt', sql.DateTime, new Date())
                .query(`
                    UPDATE Service SET
                        IsActive = @IsActive,
                        UpdateAt = @UpdateAt
                    WHERE ServiceID = @ServiceID
                `);
            
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error(`Error updating service ${serviceId} status:`, error);
            throw error;
        }
    }

    // Delete service
    async delete(serviceId) {
        try {
            // Check if service is being used in bookings
            const pool = await this.pool;
            const checkResult = await pool.request()
                .input('ServiceID', sql.Int, serviceId)
                .query('SELECT COUNT(*) as Count FROM BookingService WHERE ServiceID = @ServiceID');

            if (checkResult.recordset[0].Count > 0) {
                throw new Error('Không thể xóa dịch vụ đang được sử dụng trong booking');
            }

            const result = await pool.request()
                .input('ServiceID', sql.Int, serviceId)
                .query('DELETE FROM Service WHERE ServiceID = @ServiceID');
            
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error(`Error deleting service ${serviceId}:`, error);
            throw error;
        }
    }

    // Get services by price range
    async getServicesByPriceRange(minPrice, maxPrice) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('MinPrice', sql.Float, minPrice)
                .input('MaxPrice', sql.Float, maxPrice)
                .query(`
                    SELECT s.*,
                           COUNT(bs.BookingID) as BookingCount,
                           SUM(bs.ServiceID) as TotalBookings
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    WHERE s.Price BETWEEN @MinPrice AND @MaxPrice
                    GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                             s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                             s.CreateAt, s.UpdateAt
                    ORDER BY s.Price ASC
                `);

            return result.recordset.map(record => {
                const service = Service.fromDatabase(record);
                service.bookingCount = record.BookingCount || 0;
                service.totalBookings = record.TotalBookings || 0;
                return service;
            });
        } catch (error) {
            console.error('Error getting services by price range:', error);
            throw error;
        }
    }

    // Get popular services (most booked)
    async getPopularServices(limit = 10) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('Limit', sql.Int, limit)
                .query(`
                    SELECT TOP(@Limit) s.*,
                           COUNT(bs.BookingID) as BookingCount,
                           SUM(bs.ServiceID) as TotalBookings
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    WHERE s.IsActive = 1
                    GROUP BY s.ServiceID, s.ServiceName, s.Description, s.Price, 
                             s.Category, s.IsActive, s.Image, s.Duration, s.MaxCapacity,
                             s.CreateAt, s.UpdateAt
                    ORDER BY COUNT(bs.BookingID) DESC
                `);

            return result.recordset.map(record => {
                const service = Service.fromDatabase(record);
                service.bookingCount = record.BookingCount || 0;
                service.totalBookings = record.TotalBookings || 0;
                return service;
            });
        } catch (error) {
            console.error('Error getting popular services:', error);
            throw error;
        }
    }

    // Get service statistics
    async getServiceStatistics() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT 
                        COUNT(*) as TotalServices,
                        COUNT(CASE WHEN IsActive = 1 THEN 1 END) as ActiveServices,
                        COUNT(CASE WHEN IsActive = 0 THEN 1 END) as InactiveServices,
                        AVG(Price) as AveragePrice,
                        MIN(Price) as MinPrice,
                        MAX(Price) as MaxPrice,
                        AVG(Duration) as AverageDuration,
                        MIN(Duration) as MinDuration,
                        MAX(Duration) as MaxDuration,
                        AVG(MaxCapacity) as AverageCapacity,
                        SUM(MaxCapacity) as TotalCapacity
                    FROM Service
                `);

            return result.recordset[0];
        } catch (error) {
            console.error('Error getting service statistics:', error);
            throw error;
        }
    }

    // Check if service is in use
    async isServiceInUse(serviceId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('ServiceID', sql.Int, serviceId)
                .query('SELECT COUNT(*) as Count FROM BookingService WHERE ServiceID = @ServiceID');
            
            return result.recordset[0].Count > 0;
        } catch (error) {
            console.error('Error checking if service is in use:', error);
            throw error;
        }
    }

    // Legacy methods for backward compatibility
    async getAllServices() {
        return await this.getAll();
    }

    async getServiceById(serviceId) {
        return await this.getById(serviceId);
    }

    async createService(service) {
        return await this.insert(service);
    }

    async updateService(service) {
        return await this.update(service);
    }

    async deleteService(serviceId) {
        return await this.delete(serviceId);
    }

    // ✅ THÊM: Bulk operations
    async bulkUpdateStatus(serviceIds, isActive) {
        try {
            const pool = await this.pool;
            const placeholders = serviceIds.map((_, index) => `@param${index}`).join(',');
            
            const request = pool.request();
            serviceIds.forEach((id, index) => {
                request.input(`param${index}`, sql.Int, id);
            });
            request.input('isActive', sql.Bit, isActive);
            request.input('updateAt', sql.DateTime, new Date());
            
            const result = await request.query(`
                UPDATE Service 
                SET IsActive = @isActive, UpdateAt = @updateAt
                WHERE ServiceID IN (${placeholders})
            `);
            
            return {
                success: true,
                affectedRows: result.rowsAffected[0],
                message: `Cập nhật trạng thái ${serviceIds.length} dịch vụ thành công`
            };
        } catch (error) {
            console.error('❌ Error bulk updating service status:', error);
            throw new Error(`Lỗi khi cập nhật trạng thái hàng loạt: ${error.message}`);
        }
    }

    async bulkDelete(serviceIds) {
        try {
            const pool = await this.pool;
            
            // Check if any service is in use
            const usageChecks = await Promise.all(
                serviceIds.map(id => this.isServiceInUse(id))
            );
            
            const inUseServices = serviceIds.filter((_, index) => usageChecks[index]);
            
            if (inUseServices.length > 0) {
                throw new Error(`Không thể xóa ${inUseServices.length} dịch vụ đang được sử dụng`);
            }
            
            const placeholders = serviceIds.map((_, index) => `@param${index}`).join(',');
            
            const request = pool.request();
            serviceIds.forEach((id, index) => {
                request.input(`param${index}`, sql.Int, id);
            });
            
            const result = await request.query(`
                DELETE FROM Service WHERE ServiceID IN (${placeholders})
            `);
            
            return {
                success: true,
                deletedCount: result.rowsAffected[0],
                message: `Xóa ${result.rowsAffected[0]} dịch vụ thành công`
            };
        } catch (error) {
            console.error('❌ Error bulk deleting services:', error);
            throw error;
        }
    }

    async bulkUpdateCategory(serviceIds, category) {
        try {
            const pool = await this.pool;
            const placeholders = serviceIds.map((_, index) => `@param${index}`).join(',');
            
            const request = pool.request();
            serviceIds.forEach((id, index) => {
                request.input(`param${index}`, sql.Int, id);
            });
            request.input('category', sql.NVarChar(100), category);
            request.input('updateAt', sql.DateTime, new Date());
            
            const result = await request.query(`
                UPDATE Service 
                SET Category = @category, UpdateAt = @updateAt
                WHERE ServiceID IN (${placeholders})
            `);
            
            return {
                success: true,
                affectedRows: result.rowsAffected[0],
                message: `Cập nhật danh mục ${serviceIds.length} dịch vụ thành công`
            };
        } catch (error) {
            console.error('❌ Error bulk updating service category:', error);
            throw new Error(`Lỗi khi cập nhật danh mục hàng loạt: ${error.message}`);
        }
    }

    // ✅ THÊM: Get service usage details
    async getServiceUsage(serviceId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('ServiceID', sql.Int, serviceId)
                .query(`
                    SELECT 
                        COUNT(bs.BookingID) as TotalBookings,
                        COUNT(DISTINCT b.BookingID) as UniqueBookings,
                        COALESCE(SUM(s.Price), 0) as TotalRevenue,
                        MIN(b.CreateAt) as FirstUsed,
                        MAX(b.CreateAt) as LastUsed
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    LEFT JOIN Booking b ON bs.BookingID = b.BookingID
                    WHERE s.ServiceID = @ServiceID
                    GROUP BY s.ServiceID, s.ServiceName, s.Price
                `);
        
            const usage = result.recordset[0] || {
                TotalBookings: 0,
                UniqueBookings: 0,
                TotalRevenue: 0,
                FirstUsed: null,
                LastUsed: null
            };
        
            return {
                serviceId: serviceId,
                isInUse: usage.TotalBookings > 0,
                usage: usage
            };
        } catch (error) {
            console.error('❌ Error getting service usage:', error);
            throw new Error(`Lỗi khi lấy thông tin sử dụng dịch vụ: ${error.message}`);
        }
    }

    // ✅ THÊM: Enhanced service statistics
    async getServiceStatistics() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT 
                        COUNT(*) as TotalServices,
                        COUNT(CASE WHEN IsActive = 1 THEN 1 END) as ActiveServices,
                        COUNT(CASE WHEN IsActive = 0 THEN 1 END) as InactiveServices,
                        COUNT(DISTINCT Category) as TotalCategories,
                        AVG(CAST(Price as FLOAT)) as AveragePrice,
                        MIN(Price) as MinPrice,
                        MAX(Price) as MaxPrice,
                        AVG(CAST(Duration as FLOAT)) as AverageDuration,
                        AVG(CAST(MaxCapacity as FLOAT)) as AverageCapacity
                    FROM Service
                `);
        
            const categoryStats = await pool.request()
                .query(`
                    SELECT 
                        Category,
                        COUNT(*) as ServiceCount,
                        AVG(CAST(Price as FLOAT)) as AveragePrice,
                        COUNT(CASE WHEN IsActive = 1 THEN 1 END) as ActiveCount
                    FROM Service
                    GROUP BY Category
                    ORDER BY ServiceCount DESC
                `);
        
            const usageStats = await pool.request()
                .query(`
                    SELECT 
                        s.ServiceID,
                        s.ServiceName,
                        s.Category,
                        COUNT(bs.BookingID) as BookingCount,
                        COALESCE(SUM(s.Price), 0) as TotalRevenue
                    FROM Service s
                    LEFT JOIN BookingService bs ON s.ServiceID = bs.ServiceID
                    GROUP BY s.ServiceID, s.ServiceName, s.Category, s.Price
                    ORDER BY BookingCount DESC
                `);
        
            return {
                overview: result.recordset[0],
                categoryBreakdown: categoryStats.recordset,
                topServices: usageStats.recordset.slice(0, 10),
                leastUsedServices: usageStats.recordset.slice(-5)
            };
        } catch (error) {
            console.error('❌ Error getting service statistics:', error);
            throw new Error(`Lỗi khi lấy thống kê dịch vụ: ${error.message}`);
        }
    }
}

export default ServiceDBContext;