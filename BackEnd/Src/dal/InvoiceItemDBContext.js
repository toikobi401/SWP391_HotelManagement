import mssql from 'mssql';
import DBContext from './DBContext.js';
import InvoiceItem from '../model/InvoiceItem.js';

class InvoiceItemDBContext extends DBContext {
    constructor() {
        super();
    }

    // ✅ GET ALL INVOICE ITEMS WITH PAGINATION
    async getAllInvoiceItems(page = 1, pageSize = 20, invoiceId = null) {
        try {
            const pool = await this.pool;
            const offset = (page - 1) * pageSize;
            
            let whereClause = '';
            if (invoiceId) {
                whereClause = 'WHERE ii.InvoiceID = @invoiceId';
            }
            
            // Get total count
            const countQuery = `SELECT COUNT(*) as totalCount FROM InvoiceItem ii ${whereClause}`;
            const countRequest = pool.request();
            if (invoiceId) {
                countRequest.input('invoiceId', mssql.Int, invoiceId);
            }
            
            const countResult = await countRequest.query(countQuery);
            const totalCount = countResult.recordset[0].totalCount;
            
            // Get paginated results
            const query = `
                SELECT 
                    ii.InvoiceItemID,
                    ii.InvoiceID,
                    ii.ItemType,
                    ii.ItemID,
                    ii.ItemName,
                    ii.Quantity,
                    ii.UnitPrice,
                    ii.SubTotal,
                    ii.Description,
                    i.BookingID,
                    i.TotalAmount as InvoiceTotalAmount
                FROM InvoiceItem ii
                LEFT JOIN Invoice i ON ii.InvoiceID = i.InvoiceID
                ${whereClause}
                ORDER BY ii.InvoiceID DESC, ii.InvoiceItemID ASC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            `;
            
            const dataRequest = pool.request();
            if (invoiceId) {
                dataRequest.input('invoiceId', mssql.Int, invoiceId);
            }
            dataRequest.input('offset', mssql.Int, offset);
            dataRequest.input('pageSize', mssql.Int, pageSize);
            
            const result = await dataRequest.query(query);
            
            const invoiceItems = result.recordset.map(row => {
                const item = InvoiceItem.fromDatabase(row);
                item.bookingID = row.BookingID;
                item.invoiceTotalAmount = row.InvoiceTotalAmount;
                return item;
            });
            
            const totalPages = Math.ceil(totalCount / pageSize);
            
            return {
                success: true,
                data: invoiceItems,
                pagination: {
                    currentPage: page,
                    pageSize,
                    totalCount,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
            
        } catch (error) {
            console.error('❌ Error getting all invoice items:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy danh sách mục hóa đơn',
                error: error.message
            };
        }
    }

    // ✅ GET INVOICE ITEM BY ID
    async getInvoiceItemById(invoiceItemId) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('InvoiceItemID', mssql.Int, invoiceItemId)
                .query(`
                    SELECT 
                        ii.InvoiceItemID,
                        ii.InvoiceID,
                        ii.ItemType,
                        ii.ItemID,
                        ii.ItemName,
                        ii.Quantity,
                        ii.UnitPrice,
                        ii.SubTotal,
                        ii.Description,
                        i.BookingID,
                        i.TotalAmount as InvoiceTotalAmount,
                        i.PaymentStatus
                    FROM InvoiceItem ii
                    LEFT JOIN Invoice i ON ii.InvoiceID = i.InvoiceID
                    WHERE ii.InvoiceItemID = @InvoiceItemID
                `);
            
            if (result.recordset.length === 0) {
                return {
                    success: false,
                    notFound: true,
                    message: 'Không tìm thấy mục hóa đơn'
                };
            }
            
            const row = result.recordset[0];
            const invoiceItem = InvoiceItem.fromDatabase(row);
            invoiceItem.bookingID = row.BookingID;
            invoiceItem.invoiceTotalAmount = row.InvoiceTotalAmount;
            invoiceItem.paymentStatus = row.PaymentStatus;
            
            return {
                success: true,
                data: invoiceItem
            };
            
        } catch (error) {
            console.error('❌ Error getting invoice item by ID:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy thông tin mục hóa đơn',
                error: error.message
            };
        }
    }

    // ✅ GET INVOICE ITEMS BY INVOICE ID
    async getInvoiceItemsByInvoiceId(invoiceId) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('InvoiceID', mssql.Int, invoiceId)
                .query(`
                    SELECT * FROM InvoiceItem 
                    WHERE InvoiceID = @InvoiceID 
                    ORDER BY InvoiceItemID
                `);
            
            const invoiceItems = result.recordset.map(row => 
                InvoiceItem.fromDatabase(row)
            );
            
            return {
                success: true,
                data: invoiceItems
            };
            
        } catch (error) {
            console.error('❌ Error getting invoice items by invoice ID:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy mục hóa đơn theo invoice',
                error: error.message
            };
        }
    }

    // ✅ CREATE INVOICE ITEM
    async createInvoiceItem(invoiceItemData) {
        try {
            const pool = await this.pool;
            
            const query = `
                INSERT INTO InvoiceItem (
                    InvoiceID, ItemType, ItemID, ItemName, 
                    Quantity, UnitPrice, SubTotal, Description
                )
                OUTPUT INSERTED.InvoiceItemID
                VALUES (
                    @invoiceID, @itemType, @itemID, @itemName,
                    @quantity, @unitPrice, @subTotal, @description
                )
            `;
            
            const request = pool.request();
            request.input('invoiceID', mssql.Int, invoiceItemData.invoiceID);
            request.input('itemType', mssql.NVarChar(50), invoiceItemData.itemType);
            request.input('itemID', mssql.Int, invoiceItemData.itemID);
            request.input('itemName', mssql.NVarChar(255), invoiceItemData.itemName);
            request.input('quantity', mssql.Int, invoiceItemData.quantity);
            request.input('unitPrice', mssql.Float, invoiceItemData.unitPrice);
            request.input('subTotal', mssql.Float, invoiceItemData.subTotal);
            request.input('description', mssql.NVarChar(500), invoiceItemData.description);
            
            const result = await request.query(query);
            const invoiceItemId = result.recordset[0].InvoiceItemID;
            
            return {
                success: true,
                invoiceItemId: invoiceItemId,
                message: 'Tạo mục hóa đơn thành công'
            };
            
        } catch (error) {
            console.error('❌ Error creating invoice item:', error);
            return {
                success: false,
                message: 'Lỗi khi tạo mục hóa đơn',
                error: error.message
            };
        }
    }

    // ✅ UPDATE INVOICE ITEM
    async updateInvoiceItem(invoiceItemId, updateData) {
        try {
            const pool = await this.pool;
            
            const query = `
                UPDATE InvoiceItem 
                SET ItemName = @itemName,
                    Quantity = @quantity,
                    UnitPrice = @unitPrice,
                    SubTotal = @subTotal,
                    Description = @description
                WHERE InvoiceItemID = @invoiceItemID
            `;
            
            const request = pool.request();
            request.input('invoiceItemID', mssql.Int, invoiceItemId);
            request.input('itemName', mssql.NVarChar(255), updateData.itemName);
            request.input('quantity', mssql.Int, updateData.quantity);
            request.input('unitPrice', mssql.Float, updateData.unitPrice);
            request.input('subTotal', mssql.Float, updateData.subTotal);
            request.input('description', mssql.NVarChar(500), updateData.description);
            
            const result = await request.query(query);
            
            if (result.rowsAffected[0] === 0) {
                return {
                    success: false,
                    message: 'Không tìm thấy mục hóa đơn để cập nhật'
                };
            }
            
            return {
                success: true,
                message: 'Cập nhật mục hóa đơn thành công'
            };
            
        } catch (error) {
            console.error('❌ Error updating invoice item:', error);
            return {
                success: false,
                message: 'Lỗi khi cập nhật mục hóa đơn',
                error: error.message
            };
        }
    }

    // ✅ DELETE INVOICE ITEM
    async deleteInvoiceItem(invoiceItemId) {
        try {
            const pool = await this.pool;
            
            const query = `DELETE FROM InvoiceItem WHERE InvoiceItemID = @invoiceItemID`;
            
            const request = pool.request();
            request.input('invoiceItemID', mssql.Int, invoiceItemId);
            
            const result = await request.query(query);
            
            if (result.rowsAffected[0] === 0) {
                return {
                    success: false,
                    message: 'Không tìm thấy mục hóa đơn để xóa'
                };
            }
            
            return {
                success: true,
                message: 'Xóa mục hóa đơn thành công'
            };
            
        } catch (error) {
            console.error('❌ Error deleting invoice item:', error);
            return {
                success: false,
                message: 'Lỗi khi xóa mục hóa đơn',
                error: error.message
            };
        }
    }

    // Abstract methods implementations
    async list() {
        return await this.getAllInvoiceItems();
    }

    async get(id) {
        return await this.getInvoiceItemById(id);
    }

    async insert(invoiceItem) {
        return await this.createInvoiceItem(invoiceItem);
    }

    async update(invoiceItem) {
        return await this.updateInvoiceItem(invoiceItem.InvoiceItemID, invoiceItem);
    }

    async delete(id) {
        return await this.deleteInvoiceItem(id);
    }
}

export default InvoiceItemDBContext;