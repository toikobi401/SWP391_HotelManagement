import mssql from 'mssql';
import DBContext from './DBContext.js';
import Invoice from '../model/Invoice.js';
import InvoiceItem from '../model/InvoiceItem.js';
import PaymentDBContext from './PaymentDBContext.js'; // ✅ THÊM import

class InvoiceDBContext extends DBContext {
    constructor() {
        super();
        console.log('InvoiceDBContext initialized');
        
        // ✅ THÊM: Khởi tạo PaymentDBContext instance
        this.paymentDB = new PaymentDBContext();
    }

    // ✅ CẬP NHẬT: getAllInvoices - Thêm JOIN với WalkInGuest và User
    async getAllInvoices(searchTerm = '', status = null) {
        try {
            const pool = await this.pool;
            
            let whereClause = '';
            let conditions = [];
            
            if (searchTerm && searchTerm.trim().length > 0) {
                conditions.push(`(
                    CAST(i.InvoiceID AS NVARCHAR) LIKE @searchTerm 
                    OR CAST(i.BookingID AS NVARCHAR) LIKE @searchTerm
                    OR CAST(i.TotalAmount AS NVARCHAR) LIKE @searchTerm
                    OR wg.GuestName LIKE @searchTerm
                    OR u.Fullname LIKE @searchTerm
                    OR wg.GuestPhoneNumber LIKE @searchTerm
                    OR u.PhoneNumber LIKE @searchTerm
                )`);
            }
            
            if (status !== null && status.trim() !== '') {
                conditions.push(`i.PaymentStatus = @status`);
            }
            
            if (conditions.length > 0) {
                whereClause = `WHERE ${conditions.join(' AND ')}`;
            }
            
            // ✅ SỬA: Bỏ u.RoleID = 3 vì cột RoleID không tồn tại
            const query = `
                SELECT 
                    i.InvoiceID,
                    i.BookingID,
                    i.CreateAt,
                    i.TotalAmount,
                    i.PaymentStatus,
                    i.PaidAmount,
                    i.RemainingAmount,
                    b.BookingStatus,
                    b.BookingType,
                    CASE 
                        WHEN b.BookingType = 0 THEN N'Walk-in'
                        WHEN b.BookingType = 1 THEN N'Online'
                        ELSE N'Unknown'
                    END as BookingTypeLabel,
                    b.NumberOfGuest,
                    b.BookingAt,
                    b.GuestID,
                    b.WalkInGuestPhoneNumber,
                    b.CustomerID,
                    -- ✅ SỬA: Customer name logic với RoleID từ UserRole
                    CASE 
                        WHEN b.BookingType = 0 AND wg.GuestName IS NOT NULL THEN wg.GuestName
                        WHEN b.BookingType = 1 AND u.Fullname IS NOT NULL AND ur.RoleID = 3 THEN u.Fullname
                        WHEN b.BookingType = 0 THEN N'Khách vãng lai'
                        ELSE N'Chưa xác định'
                    END as CustomerName,
                    -- ✅ SỬA: Customer phone logic với RoleID từ UserRole
                    CASE 
                        WHEN b.BookingType = 0 AND wg.GuestPhoneNumber IS NOT NULL THEN wg.GuestPhoneNumber
                        WHEN b.BookingType = 1 AND u.PhoneNumber IS NOT NULL AND ur.RoleID = 3 THEN u.PhoneNumber
                        WHEN b.BookingType = 0 AND b.WalkInGuestPhoneNumber IS NOT NULL THEN b.WalkInGuestPhoneNumber
                        ELSE NULL
                    END as CustomerPhone,
                    -- ✅ Customer type for display
                    CASE 
                        WHEN b.BookingType = 0 THEN N'Khách vãng lai'
                        WHEN b.BookingType = 1 THEN N'Khách hàng online'
                        ELSE N'Không xác định'
                    END as CustomerType,
                    COUNT(ii.InvoiceItemID) as ItemCount
                FROM Invoice i
                LEFT JOIN Booking b ON i.BookingID = b.BookingID
                LEFT JOIN WalkInGuest wg ON (b.BookingType = 0 AND b.WalkInGuestPhoneNumber = wg.GuestPhoneNumber)
                LEFT JOIN [User] u ON (b.BookingType = 1 AND b.CustomerID = u.UserID)
                LEFT JOIN UserRole ur ON (b.BookingType = 1 AND u.UserID = ur.UserID AND ur.RoleID = 3)
                LEFT JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                ${whereClause}
                GROUP BY i.InvoiceID, i.BookingID, i.CreateAt, i.TotalAmount, 
                         i.PaymentStatus, i.PaidAmount, i.RemainingAmount, 
                         b.BookingStatus, b.BookingType, b.NumberOfGuest, 
                         b.BookingAt, b.GuestID, b.WalkInGuestPhoneNumber, b.CustomerID,
                         wg.GuestName, wg.GuestPhoneNumber, u.Fullname, u.PhoneNumber, ur.RoleID
                ORDER BY i.CreateAt DESC
            `;
            
            const dataRequest = pool.request();
            if (searchTerm && searchTerm.trim().length > 0) {
                dataRequest.input('searchTerm', mssql.NVarChar, `%${searchTerm.trim()}%`);
            }
            if (status !== null && status.trim() !== '') {
                dataRequest.input('status', mssql.NVarChar, status.trim());
            }
            
            const result = await dataRequest.query(query);
            
            const invoices = result.recordset.map(row => ({
                InvoiceID: row.InvoiceID,
                BookingID: row.BookingID,
                CreateAt: row.CreateAt,
                TotalAmount: row.TotalAmount,
                PaymentStatus: row.PaymentStatus,
                PaidAmount: row.PaidAmount,
                RemainingAmount: row.RemainingAmount,
                BookingStatus: row.BookingStatus,
                BookingType: row.BookingType,
                BookingTypeLabel: row.BookingTypeLabel,
                NumberOfGuest: row.NumberOfGuest,
                BookingAt: row.BookingAt,
                GuestID: row.GuestID,
                WalkInGuestPhoneNumber: row.WalkInGuestPhoneNumber,
                CustomerID: row.CustomerID,
                ItemCount: row.ItemCount,
                // ✅ Customer information
                CustomerName: row.CustomerName,
                CustomerPhone: row.CustomerPhone,
                CustomerType: row.CustomerType
            }));
            
            console.log(`✅ Loaded ${invoices.length} invoices from database with customer info`);
            
            return {
                success: true,
                data: invoices,
                totalCount: invoices.length
            };
            
        } catch (error) {
            console.error('❌ Error getting all invoices:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy danh sách hóa đơn',
                error: error.message
            };
        }
    }

    // ✅ GET INVOICE BY ID WITH ITEMS
    async getInvoiceWithItems(invoiceId) {
        try {
            console.log(`🔍 Getting invoice with items: ${invoiceId}`);
            
            const pool = await this.pool;
            // JOIN Booking, User (Customer), WalkInGuest, Receptionist
            const query = `
                SELECT 
                    i.*,
                    b.BookingID, b.CustomerID, b.ReceptionistID, b.NumberOfGuest, b.SpecialRequest, b.BookingType, b.BookingAt, b.GuestID, b.CreateAt as BookingCreateAt, b.UpdateAt as BookingUpdateAt, b.WalkInGuestPhoneNumber, b.BookingStatus,
                    -- Customer (User)
                    u.Fullname as CustomerName, u.Email as CustomerEmail, u.PhoneNumber as CustomerPhone,
                    -- WalkInGuest
                    wg.GuestName as WalkInGuestName, wg.GuestEmail as WalkInGuestEmail, wg.GuestPhoneNumber as WalkInGuestPhone,
                    -- Receptionist
                    ru.Fullname as ReceptionistName, ru.Email as ReceptionistEmail
                FROM Invoice i
                LEFT JOIN Booking b ON i.BookingID = b.BookingID
                LEFT JOIN [User] u ON b.CustomerID = u.UserID
                LEFT JOIN WalkInGuest wg ON b.WalkInGuestPhoneNumber = wg.GuestPhoneNumber
                LEFT JOIN [User] ru ON b.ReceptionistID = ru.UserID
                WHERE i.InvoiceID = @invoiceId
            `;
            const request = pool.request();
            request.input('invoiceId', mssql.Int, invoiceId);

            const result = await request.query(query);
            if (!result.recordset.length) {
                return { success: false, message: 'Không tìm thấy hóa đơn' };
            }
            const invoice = result.recordset[0];

            // ✅ THÊM LOG DEBUG THÔNG TIN LẤY RA TỪ DB
            console.log('🔍 [InvoiceDBContext] Invoice raw data from DB:', JSON.stringify(invoice, null, 2));

            // ✅ Get invoice items
            const itemsQuery = `
              SELECT * FROM InvoiceItem 
              WHERE InvoiceID = @invoiceID 
              ORDER BY ItemType, InvoiceItemID
            `;
            
            const itemsRequest = pool.request();
            itemsRequest.input('invoiceID', mssql.Int, invoiceId);
            
            const itemsResult = await itemsRequest.query(itemsQuery);
            const invoiceItems = itemsResult.recordset.map(row => InvoiceItem.fromDatabase(row));
            
            // ✅ FIX: Tạo response object đầy đủ với structure nhất quán
            const invoiceData = {
              InvoiceID: invoice.InvoiceID,
              BookingID: invoice.BookingID,
              CreateAt: invoice.CreateAt,
              TotalAmount: invoice.TotalAmount,
              PaymentStatus: invoice.PaymentStatus,
              PaidAmount: invoice.PaidAmount,
              RemainingAmount: invoice.RemainingAmount,
              
              // ✅ THÊM: Booking info
              bookingInfo: {
                bookingID: invoice.BookingID,
                numberOfGuest: invoice.NumberOfGuest,
                specialRequest: invoice.SpecialRequest,
                bookingStatus: invoice.BookingStatus,
                bookingCreateAt: invoice.BookingCreateAt,
                receptionistID: invoice.ReceptionistID,
                receptionistName: invoice.ReceptionistName
              },
              
              // ✅ THÊM: Guest info
              guestInfo: {
                guestName: invoice.GuestName,
                guestEmail: invoice.GuestEmail,
                guestPhoneNumber: invoice.GuestPhoneNumber
              },
              
              // ✅ THÊM: Invoice items
              invoiceItems: invoiceItems,
              
              // Thêm trường customerInfo cho frontend dễ dùng
              customerInfo: {
                name: invoice.CustomerName || invoice.WalkInGuestName || 'N/A',
                email: invoice.CustomerEmail || invoice.WalkInGuestEmail || 'N/A',
                phone: invoice.CustomerPhone || invoice.WalkInGuestPhone || 'N/A',
                type: invoice.CustomerID ? 'User' : 'WalkInGuest'
              },
              receptionistInfo: {
                name: invoice.ReceptionistName || '',
                email: invoice.ReceptionistEmail || ''
              }
            };
            
            console.log(`✅ Invoice found with ${invoiceItems.length} items:`, {
              invoiceID: invoice.InvoiceID,
              bookingID: invoice.BookingID,
              totalAmount: invoice.TotalAmount,
              paymentStatus: invoice.PaymentStatus,
              itemsCount: invoiceItems.length
            });
            
            return {
              success: true,
              data: invoiceData
            };
            
        } catch (error) {
            console.error('❌ Error getting invoice with items:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy thông tin hóa đơn: ' + error.message,
                error: error.message
            };
        }
    }

    // ✅ CREATE INVOICE WITH ITEMS FOR BOOKING
    async createInvoiceForBooking(bookingId) {
        let transaction = null;
        
        try {
            const pool = await this.pool;
            transaction = new mssql.Transaction(pool);
            
            await transaction.begin();
            console.log('📝 Creating invoice for booking:', bookingId);
            
            // ✅ 1. Get booking data với đầy đủ thông tin
            const bookingRequest = new mssql.Request(transaction);
            const bookingResult = await bookingRequest
                .input('BookingID', mssql.Int, bookingId)
                .query(`
                    SELECT 
                        b.BookingID,
                        b.NumberOfGuest,
                        b.SpecialRequest,
                        b.CreateAt,
                        b.BookingStatus,
                        b.ReceptionistID,
                        wg.GuestName,
                        wg.GuestEmail,
                        wg.GuestPhoneNumber
                    FROM Booking b
                    LEFT JOIN WalkInGuest wg ON b.WalkInGuestPhoneNumber = wg.GuestPhoneNumber
                    WHERE b.BookingID = @BookingID
                `);

            if (bookingResult.recordset.length === 0) {
                throw new Error(`Booking ${bookingId} not found`);
            }

            const booking = bookingResult.recordset[0];
            console.log('📊 Booking found:', booking);

            // ✅ 2. Get booking rooms (room types và quantities)
            const roomsRequest = new mssql.Request(transaction);
            const roomsResult = await roomsRequest
                .input('BookingID', mssql.Int, bookingId)
                .query(`
                    SELECT 
                        br.BookingID,
                        br.RoomID,
                        r.RoomNumber,
                        r.CurrentPrice,
                        rt.TypeName,
                        rt.BasePrice,
                        COUNT(*) as Quantity
                    FROM BookingRoom br
                    LEFT JOIN Room r ON br.RoomID = r.RoomID
                    LEFT JOIN RoomType rt ON r.TypeID = rt.TypeID
                    WHERE br.BookingID = @BookingID
                    GROUP BY br.BookingID, br.RoomID, r.RoomNumber, r.CurrentPrice, rt.TypeName, rt.BasePrice
                `);

            console.log(`🏠 Found ${roomsResult.recordset.length} room assignments`);

            // ✅ 3. Get booking services
            const servicesRequest = new mssql.Request(transaction);
            const servicesResult = await servicesRequest
                .input('BookingID', mssql.Int, bookingId)
                .query(`
                    SELECT 
                        bs.BookingID,
                        bs.ServiceID,
                        s.ServiceName,
                        s.Price,
                        s.Description,
                        COUNT(*) as Quantity
                    FROM BookingService bs
                    LEFT JOIN Service s ON bs.ServiceID = s.ServiceID
                    WHERE bs.BookingID = @BookingID
                    GROUP BY bs.BookingID, bs.ServiceID, s.ServiceName, s.Price, s.Description
                `);

            console.log(`🛎️ Found ${servicesResult.recordset.length} services`);

            // ✅ 4. Get booking promotions
            const promotionsRequest = new mssql.Request(transaction);
            const promotionsResult = await promotionsRequest
                .input('BookingID', mssql.Int, bookingId)
                .query(`
                    SELECT 
                        bp.BookingID,
                        bp.PromotionID,
                        p.PromotionName,
                        p.DiscountPercent,
                        p.Description
                    FROM BookingPromotion bp
                    LEFT JOIN Promotion p ON bp.PromotionID = p.PromotionID
                    WHERE bp.BookingID = @BookingID
                `);

            console.log(`🏷️ Found ${promotionsResult.recordset.length} promotions`);

            // ✅ 5. Create Invoice record với PaidAmount = 0
            const invoiceRequest = new mssql.Request(transaction);
            const invoiceResult = await invoiceRequest
                .input('BookingID', mssql.Int, bookingId)
                .input('CreateAt', mssql.DateTime, new Date())
                .input('PaymentStatus', mssql.NVarChar(20), 'Pending')
                .input('PaidAmount', mssql.Float, 0) // ✅ Ban đầu = 0
                .query(`
                    INSERT INTO Invoice (BookingID, CreateAt, TotalAmount, PaymentStatus, PaidAmount, RemainingAmount)
                    OUTPUT INSERTED.InvoiceID
                    VALUES (@BookingID, @CreateAt, 0, @PaymentStatus, @PaidAmount, 0)
                `);

            const invoiceId = invoiceResult.recordset[0].InvoiceID;
            console.log(`✅ Invoice created with ID: ${invoiceId}`);

            let totalAmount = 0;
            let itemsCreated = 0;

            // ✅ 6. Create Room InvoiceItems
            for (const roomAssignment of roomsResult.recordset) {
                const roomItemRequest = new mssql.Request(transaction);
                
                const unitPrice = roomAssignment.CurrentPrice || roomAssignment.BasePrice || 0;
                const quantity = roomAssignment.Quantity || 1;
                const subTotal = unitPrice * quantity;
                
                await roomItemRequest
                    .input('InvoiceID', mssql.Int, invoiceId)
                    .input('ItemType', mssql.NVarChar(50), 'Room')
                    .input('ItemID', mssql.Int, roomAssignment.RoomID)
                    .input('ItemName', mssql.NVarChar(255), `${roomAssignment.TypeName} - Phòng ${roomAssignment.RoomNumber}`)
                    .input('Quantity', mssql.Int, quantity)
                    .input('UnitPrice', mssql.Float, unitPrice)
                    .input('SubTotal', mssql.Float, subTotal)
                    .input('Description', mssql.NVarChar(500), `Phòng ${roomAssignment.RoomNumber} - ${roomAssignment.TypeName}`)
                    .query(`
                        INSERT INTO InvoiceItem (InvoiceID, ItemType, ItemID, ItemName, Quantity, UnitPrice, SubTotal, Description)
                        VALUES (@InvoiceID, @ItemType, @ItemID, @ItemName, @Quantity, @UnitPrice, @SubTotal, @Description)
                    `);

                totalAmount += subTotal;
                itemsCreated++;
                
                console.log(`➕ Room item added: ${roomAssignment.RoomNumber} - ${subTotal.toLocaleString('vi-VN')}đ`);
            }

            // ✅ 7. Create Service InvoiceItems
            for (const service of servicesResult.recordset) {
                const serviceItemRequest = new mssql.Request(transaction);
                
                const unitPrice = service.Price || 0;
                const quantity = service.Quantity || 1;
                const subTotal = unitPrice * quantity;
                
                await serviceItemRequest
                    .input('InvoiceID', mssql.Int, invoiceId)
                    .input('ItemType', mssql.NVarChar(50), 'Service')
                    .input('ItemID', mssql.Int, service.ServiceID)
                    .input('ItemName', mssql.NVarChar(255), service.ServiceName)
                    .input('Quantity', mssql.Int, quantity)
                    .input('UnitPrice', mssql.Float, unitPrice)
                    .input('SubTotal', mssql.Float, subTotal)
                    .input('Description', mssql.NVarChar(500), service.Description || service.ServiceName)
                    .query(`
                        INSERT INTO InvoiceItem (InvoiceID, ItemType, ItemID, ItemName, Quantity, UnitPrice, SubTotal, Description)
                        VALUES (@InvoiceID, @ItemType, @ItemID, @ItemName, @Quantity, @UnitPrice, @SubTotal, @Description)
                    `);

                totalAmount += subTotal;
                itemsCreated++;
                
                console.log(`➕ Service item added: ${service.ServiceName} - ${subTotal.toLocaleString('vi-VN')}đ`);
            }

            // ✅ 8. Create Promotion InvoiceItems (as discounts)
            for (const promotion of promotionsResult.recordset) {
                const promotionItemRequest = new mssql.Request(transaction);
                
                // Calculate discount amount based on current total
                const discountPercent = promotion.DiscountPercent || 0;
                const discountAmount = Math.round((totalAmount * discountPercent) / 100);
                
                if (discountAmount > 0) {
                    await promotionItemRequest
                        .input('InvoiceID', mssql.Int, invoiceId)
                        .input('ItemType', mssql.NVarChar(50), 'Promotion')
                        .input('ItemID', mssql.Int, promotion.PromotionID)
                        .input('ItemName', mssql.NVarChar(255), promotion.PromotionName)
                        .input('Quantity', mssql.Int, 1)
                        .input('UnitPrice', mssql.Float, -discountAmount) // Negative for discount
                        .input('SubTotal', mssql.Float, -discountAmount)
                        .input('Description', mssql.NVarChar(500), `Giảm giá ${discountPercent}% - ${promotion.Description || ''}`)
                        .query(`
                            INSERT INTO InvoiceItem (InvoiceID, ItemType, ItemID, ItemName, Quantity, UnitPrice, SubTotal, Description)
                            VALUES (@InvoiceID, @ItemType, @ItemID, @ItemName, @Quantity, @UnitPrice, @SubTotal, @Description)
                        `);

                    totalAmount -= discountAmount; // Subtract discount from total
                    itemsCreated++;
                    
                    console.log(`➖ Promotion item added: ${promotion.PromotionName} - -${discountAmount.toLocaleString('vi-VN')}đ`);
                }
            }

            // ✅ 9. Update Invoice với TotalAmount = RemainingAmount
            const updateInvoiceRequest = new mssql.Request(transaction);
            await updateInvoiceRequest
                .input('InvoiceID', mssql.Int, invoiceId)
                .input('TotalAmount', mssql.Float, Math.max(0, totalAmount))
                .input('PaidAmount', mssql.Float, 0) // ✅ Chưa thanh toán gì
                .input('RemainingAmount', mssql.Float, Math.max(0, totalAmount)) // ✅ = TotalAmount
                .query(`
                    UPDATE Invoice 
                    SET TotalAmount = @TotalAmount, 
                        PaidAmount = @PaidAmount,
                        RemainingAmount = @RemainingAmount
                    WHERE InvoiceID = @InvoiceID
                `);

            await transaction.commit();
            
            console.log(`✅ Invoice created successfully:`, {
                invoiceId,
                totalAmount: Math.max(0, totalAmount),
                paidAmount: 0,
                remainingAmount: Math.max(0, totalAmount),
                itemsCreated
            });
            
            return {
                success: true,
                invoiceId: invoiceId,
                totalAmount: Math.max(0, totalAmount),
                paidAmount: 0,
                remainingAmount: Math.max(0, totalAmount),
                itemsCreated: itemsCreated,
                message: `Invoice created successfully with ${itemsCreated} items`
            };
            
        } catch (error) {
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('🔄 Transaction rolled back due to error');
                } catch (rollbackError) {
                    console.error('❌ Error rolling back transaction:', rollbackError);
                }
            }
            
            console.error('❌ Error creating invoice for booking:', error);
            
            return {
                success: false,
                message: 'Error creating invoice for booking: ' + error.message,
                error: error.message
            };
        }
    }

    // ✅ PROCESS DEPOSIT PAYMENT
    async processDepositPayment(invoiceId, depositAmount, paymentMethod = 'Cash') {
        let transaction = null;
        
        try {
            const pool = await this.pool;
            transaction = new mssql.Transaction(pool);
            
            await transaction.begin();
            console.log('💰 Processing deposit payment transaction...');

            // ✅ SỬA: Get invoice WITHOUT validation logic
            const invoiceRequest = new mssql.Request(transaction);
            const invoiceResult = await invoiceRequest
                .input('InvoiceID', mssql.Int, invoiceId)
                .query(`
                    SELECT InvoiceID, TotalAmount, PaidAmount, RemainingAmount, PaymentStatus
                    FROM Invoice
                    WHERE InvoiceID = @InvoiceID
                `);

            if (invoiceResult.recordset.length === 0) {
                throw new Error(`Invoice ${invoiceId} not found`);
            }

            const invoice = invoiceResult.recordset[0];
            
            // ✅ XÓA: Validation với RemainingAmount
            // if (depositAmount > invoice.RemainingAmount) {
            //     throw new Error(`Số tiền cọc không được vượt quá số tiền còn lại: ${invoice.RemainingAmount}`);
            // }

            // ✅ CHỈ GIỮ: Basic validation
            if (depositAmount <= 0) {
                throw new Error('Số tiền thanh toán phải lớn hơn 0');
            }

            // ✅ ĐƠN GIẢN: Cập nhật invoice với số tiền mới
            const newPaidAmount = (invoice.PaidAmount || 0) + depositAmount;
            const newRemainingAmount = Math.max(0, invoice.TotalAmount - newPaidAmount);
            
            let newPaymentStatus = 'Pending';
            if (newRemainingAmount <= 0) {
                newPaymentStatus = 'Paid';
            } else if (newPaidAmount > 0) {
                newPaymentStatus = 'Partial';
            }

            const updateRequest = new mssql.Request(transaction);
            await updateRequest
                .input('InvoiceID', mssql.Int, invoiceId)
                .input('PaidAmount', mssql.Float, newPaidAmount)
                .input('RemainingAmount', mssql.Float, newRemainingAmount)
                .input('PaymentStatus', mssql.NVarChar(20), newPaymentStatus)
                .query(`
                    UPDATE Invoice 
                    SET PaidAmount = @PaidAmount,
                        RemainingAmount = @RemainingAmount,
                        PaymentStatus = @PaymentStatus
                    WHERE InvoiceID = @InvoiceID
                `);

            await transaction.commit();
            console.log('✅ Deposit payment processed successfully');

            return {
                success: true,
                message: 'Thanh toán cọc thành công',
                invoiceId: invoiceId,
                depositAmount: depositAmount,
                newPaidAmount: newPaidAmount,
                newRemainingAmount: newRemainingAmount,
                newPaymentStatus: newPaymentStatus
            };

        } catch (error) {
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('🔄 Transaction rolled back');
                } catch (rollbackError) {
                    console.error('❌ Rollback error:', rollbackError);
                }
            }
            
            console.error('❌ Error processing deposit payment:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // ✅ THÊM: GET INVOICE BY ID (simple version) - cho deposit payment
    async getInvoiceById(invoiceId) {
        try {
            const pool = await this.pool;
            console.log('🔍 Getting invoice by ID:', invoiceId);
            
            const result = await pool.request()
                .input('InvoiceID', mssql.Int, invoiceId)
                .query(`
                    SELECT 
                        InvoiceID,
                        BookingID,
                        CreateAt,
                        TotalAmount,
                        PaymentStatus,
                        PaidAmount,
                        RemainingAmount
                    FROM Invoice
                    WHERE InvoiceID = @InvoiceID
                `);

            if (result.recordset.length === 0) {
                console.log('❌ Invoice not found:', invoiceId);
                return null;
            }

            const invoice = result.recordset[0];
            console.log('✅ Invoice found:', {
                invoiceID: invoice.InvoiceID,
                totalAmount: invoice.TotalAmount,
                paymentStatus: invoice.PaymentStatus,
                paidAmount: invoice.PaidAmount,
                remainingAmount: invoice.RemainingAmount
            });

            return invoice;
            
        } catch (error) {
            console.error('❌ Error getting invoice by ID:', error);
            throw error;
        }
    }

    // ✅ THÊM: Create payment record method
    async createPaymentRecord(paymentData) {
        try {
            const pool = await this.pool;
            
            console.log('💰 Creating payment record:', paymentData);
            
            const query = `
                INSERT INTO Payment (
                    InvoiceID, PaymentMethod, PaymentStatus, Amount, 
                    TransactionID, BankCode, PaymentGatewayResponse, QRCodeUrl,
                    PaymentDate, ExpiryDate, RetryCount, Notes, CreatedAt, UpdatedAt
                )
                OUTPUT INSERTED.PaymentID
                VALUES (
                    @invoiceId, @paymentMethod, @paymentStatus, @amount,
                    @transactionId, @bankCode, @paymentGatewayResponse, @qrCodeUrl,
                    @paymentDate, @expiryDate, @retryCount, @notes, @createdAt, @updatedAt
                )
            `;
            
            const request = pool.request();
            request.input('invoiceId', mssql.Int, paymentData.invoiceId);
            request.input('paymentMethod', mssql.NVarChar(20), paymentData.paymentMethod || 'Cash');
            request.input('paymentStatus', mssql.NVarChar(20), paymentData.status || 'Completed');
            request.input('amount', mssql.Float, paymentData.amount);
            request.input('transactionId', mssql.NVarChar(100), paymentData.transactionId || null);
            request.input('bankCode', mssql.NVarChar(20), paymentData.bankCode || null);
            request.input('paymentGatewayResponse', mssql.NVarChar, paymentData.paymentGatewayResponse || null);
            request.input('qrCodeUrl', mssql.NVarChar(500), paymentData.qrCodeUrl || null);
            request.input('paymentDate', mssql.DateTime, paymentData.paymentDate || new Date());
            request.input('expiryDate', mssql.DateTime, paymentData.expiryDate || null);
            request.input('retryCount', mssql.Int, paymentData.retryCount || 0);
            request.input('notes', mssql.NVarChar(500), paymentData.notes || '');
            request.input('createdAt', mssql.DateTime, new Date());
            request.input('updatedAt', mssql.DateTime, new Date());
            
            const result = await request.query(query);
            
            if (result.recordset.length > 0) {
                const paymentId = result.recordset[0].PaymentID;
                
                console.log('✅ Payment record created successfully:', paymentId);
                
                return {
                    success: true,
                    paymentId: paymentId,
                    message: 'Tạo bản ghi thanh toán thành công'
                };
            } else {
                throw new Error('Không thể tạo bản ghi thanh toán');
            }
            
        } catch (error) {
            console.error('❌ Error creating payment record:', error);
            return {
                success: false,
                message: `Lỗi khi tạo bản ghi thanh toán: ${error.message}`,
                error: error.message
            };
        }
    }

    // ✅ THÊM: Get payment history for invoice
    async getPaymentHistory(invoiceId) {
        try {
            const pool = await this.pool;
            
            const query = `
                SELECT 
                    p.PaymentID,
                    p.InvoiceID,
                    p.PaymentMethod,
                    p.PaymentStatus,
                    p.Amount,
                    p.TransactionID,
                    p.BankCode,
                    p.PaymentGatewayResponse,
                    p.QRCodeUrl,
                    p.PaymentDate,
                    p.ExpiryDate,
                    p.RetryCount,
                    p.Notes,
                    p.CreatedAt,
                    p.UpdatedAt
                FROM Payment p
                WHERE p.InvoiceID = @invoiceId
                ORDER BY p.CreatedAt DESC
            `;
            
            const result = await pool.request()
                .input('invoiceId', mssql.Int, invoiceId)
                .query(query);
            
            const payments = result.recordset.map(row => ({
                PaymentID: row.PaymentID,
                InvoiceID: row.InvoiceID,
                PaymentMethod: row.PaymentMethod,
                PaymentStatus: row.PaymentStatus,
                Amount: row.Amount,
                TransactionID: row.TransactionID,
                BankCode: row.BankCode,
                PaymentGatewayResponse: row.PaymentGatewayResponse,
                QRCodeUrl: row.QRCodeUrl,
                PaymentDate: row.PaymentDate,
                ExpiryDate: row.ExpiryDate,
                RetryCount: row.RetryCount,
                Notes: row.Notes,
                CreatedAt: row.CreatedAt,
                UpdatedAt: row.UpdatedAt
            }));
            
            return {
                success: true,
                data: payments
            };
            
        } catch (error) {
            console.error('❌ Error getting payment history:', error);
            return {
                success: false,
                message: `Lỗi khi lấy lịch sử thanh toán: ${error.message}`,
                error: error.message
            };
        }
    }

    // ✅ THÊM: Get payment statistics for invoice
    async getPaymentStatistics(invoiceId) {
        try {
            const pool = await this.pool;
            
            const query = `
                SELECT 
                    COUNT(*) as TotalPayments,
                    COALESCE(SUM(CASE WHEN PaymentStatus = 'Completed' THEN Amount ELSE 0 END), 0) as TotalPaid,
                    COALESCE(SUM(CASE WHEN PaymentStatus = 'Pending' THEN Amount ELSE 0 END), 0) as TotalPending,
                    COALESCE(SUM(CASE WHEN PaymentStatus = 'Failed' THEN Amount ELSE 0 END), 0) as TotalFailed,
                    COALESCE(SUM(CASE WHEN PaymentMethod = 'Refund' THEN Amount ELSE 0 END), 0) as TotalRefunded,
                    MIN(CreatedAt) as FirstPaymentDate,
                    MAX(CreatedAt) as LastPaymentDate
                FROM Payment 
                WHERE InvoiceID = @invoiceId
            `;
            
            const result = await pool.request()
                .input('invoiceId', mssql.Int, invoiceId)
                .query(query);
            
            const stats = result.recordset[0] || {
                TotalPayments: 0,
                TotalPaid: 0,
                TotalPending: 0,
                TotalFailed: 0,
                TotalRefunded: 0,
                FirstPaymentDate: null,
                LastPaymentDate: null
            };
            
            return {
                success: true,
                data: stats
            };
            
        } catch (error) {
            console.error('❌ Error getting payment statistics:', error);
            return {
                success: false,
                message: `Lỗi khi lấy thống kê thanh toán: ${error.message}`,
                error: error.message
            };
        }
    }

    // ✅ THÊM: Update payment status
    async updatePaymentStatus(paymentId, status, notes = '') {
        try {
            const pool = await this.pool;
            
            const query = `
                UPDATE Payment 
                SET PaymentStatus = @status, 
                    Notes = @notes,
                    UpdatedAt = @updatedAt
                WHERE PaymentID = @paymentId
            `;
            
            const result = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .input('status', mssql.NVarChar(20), status)
                .input('notes', mssql.NVarChar(500), notes)
                .input('updatedAt', mssql.DateTime, new Date())
                .query(query);
            
            if (result.rowsAffected[0] > 0) {
                return {
                    success: true,
                    message: 'Cập nhật trạng thái thanh toán thành công'
                };
            } else {
                throw new Error('Không tìm thấy bản ghi thanh toán để cập nhật');
            }
            
        } catch (error) {
            console.error('❌ Error updating payment status:', error);
            return {
                success: false,
                message: `Lỗi khi cập nhật trạng thái thanh toán: ${error.message}`,
                error: error.message
            };
        }
    }

    // Abstract methods implementations
    async list() {
        return await this.getAllInvoices();
    }

    async get(id) {
        return await this.getInvoiceWithItems(id);
    }

    async insert(invoice) {
        return await this.createInvoiceForBooking(invoice.bookingId);
    }

    async update(invoice) {
        return await this.updatePaymentStatus(invoice.InvoiceID, invoice.PaidAmount);
    }

    async delete(id) {
        return await this.updatePaymentStatus(id, { paymentStatus: 'Cancelled' });
    }

    // ✅ THÊM: CREATE INVOICE FROM BOOKING DATA (từ frontend)
    async createInvoiceFromBookingData(bookingData) {
        let transaction = null;
        
        try {
            // ✅ SỬA: Enhanced logging để debug promotion data
            console.log('🏗️ Creating invoice from booking data:', {
                bookingID: bookingData.bookingID,
                hasRoomTypes: !!bookingData.selectedRooms,
                hasServices: !!bookingData.selectedServices,
                hasPromotions: !!bookingData.selectedPromotions,
                // ✅ THÊM: Promotion specific debugging
                appliedPromotion: bookingData.appliedPromotion,
                promotionDiscount: bookingData.promotionDiscount,
                selectedPromotionsLength: bookingData.selectedPromotions?.length || 0,
                appliedPromotionInfo: bookingData.appliedPromotionInfo,
                bookingDataKeys: Object.keys(bookingData || {}),
                rawBookingData: bookingData
            });

            const pool = await this.pool;
            transaction = new mssql.Transaction(pool);
            await transaction.begin();

            // ✅ SỬA: Validate bookingID từ bookingData - chỉ sửa phần này
            const bookingID = bookingData.bookingID || bookingData.bookingId;
            if (!bookingID) {
                throw new Error('BookingID không tồn tại trong booking data');
            }

            // ✅ Create Invoice record
            const invoiceQuery = `
                INSERT INTO Invoice (BookingID, CreateAt, TotalAmount, PaymentStatus, PaidAmount, RemainingAmount)
                OUTPUT INSERTED.InvoiceID
                VALUES (@bookingID, @createAt, @totalAmount, @paymentStatus, @paidAmount, @remainingAmount)
            `;

            const invoiceRequest = new mssql.Request(transaction);
            invoiceRequest.input('bookingID', mssql.Int, bookingID);
            invoiceRequest.input('createAt', mssql.DateTime, new Date());
            invoiceRequest.input('totalAmount', mssql.Decimal(10,2), 0); // Will update after items
            invoiceRequest.input('paymentStatus', mssql.NVarChar(20), 'Pending');
            invoiceRequest.input('paidAmount', mssql.Decimal(10,2), 0);
            invoiceRequest.input('remainingAmount', mssql.Decimal(10,2), 0);

            const invoiceResult = await invoiceRequest.query(invoiceQuery);
            const invoiceID = invoiceResult.recordset[0].InvoiceID;
            
            console.log(`✅ Invoice created with ID: ${invoiceID}`);

            let totalAmount = 0;
            let itemsCreated = 0;

            // ✅ GIỮ NGUYÊN: Room processing
            if (bookingData.selectedRooms && Array.isArray(bookingData.selectedRooms)) {
                console.log('🏠 Processing room items...');
                
                const roomTypeQuery = `
                    SELECT TypeId, TypeName, BasePrice 
                    FROM RoomType 
                    WHERE TypeId IN (${bookingData.selectedRooms.map(r => `'${r.roomTypeId}'`).join(',')})
                `;
                
                const roomTypeRequest = new mssql.Request(transaction);
                const roomTypeResult = await roomTypeRequest.query(roomTypeQuery);
                
                console.log('📊 Room types from database:', roomTypeResult.recordset);
                
                const roomTypePrices = {};
                roomTypeResult.recordset.forEach(rt => {
                    roomTypePrices[rt.TypeId] = {
                        name: rt.TypeName,
                        price: rt.BasePrice
                    };
                });

                const nights = this.calculateNights(bookingData.checkInDate, bookingData.checkOutDate);
                const effectiveNights = Math.max(1, nights);
                
                console.log(`📅 Calculated ${effectiveNights} nights for pricing`);

                for (const room of bookingData.selectedRooms) {
                    const roomTypeInfo = roomTypePrices[room.roomTypeId];
                    
                    if (roomTypeInfo) {
                        const unitPrice = roomTypeInfo.price || 0;
                        const quantity = (room.quantity || 1) * effectiveNights;
                        const subTotal = unitPrice * quantity;
                        
                        const roomItemData = {
                            itemType: 'Room',
                            itemName: `${roomTypeInfo.name} x${room.quantity} (${effectiveNights} đêm)`,
                            description: `Phòng ${roomTypeInfo.name} - ${room.quantity} phòng × ${effectiveNights} đêm`,
                            quantity: quantity,
                            unitPrice: unitPrice,
                            subTotal: subTotal,
                            itemID: parseInt(room.roomTypeId)
                        };

                        await this.createInvoiceItem(transaction, invoiceID, roomItemData);
                        totalAmount += subTotal;
                        itemsCreated++;
                        
                        console.log(`➕ Room item added: ${roomItemData.itemName} - ${subTotal.toLocaleString()}đ`);
                    } else {
                        console.warn(`⚠️ Room type ${room.roomTypeId} not found in database`);
                    }
                }
            }

            // ✅ GIỮ NGUYÊN: Services processing
            if (bookingData.selectedServices && Array.isArray(bookingData.selectedServices)) {
                console.log('🛎️ Processing service items...');
                
                for (const service of bookingData.selectedServices) {
                    const serviceInfo = this.getServiceInfo(service.serviceId || service.id, bookingData.availableServices);
                    
                    if (serviceInfo) {
                        const serviceItemData = {
                            itemType: 'Service',
                            itemName: serviceInfo.serviceName || serviceInfo.name,
                            description: serviceInfo.serviceDescription || serviceInfo.description || '',
                            quantity: service.quantity || 1,
                            unitPrice: serviceInfo.servicePrice || serviceInfo.price || 0,
                            subTotal: (service.quantity || 1) * (serviceInfo.servicePrice || serviceInfo.price || 0),
                            itemID: service.serviceId || service.id
                        };

                        await this.createInvoiceItem(transaction, invoiceID, serviceItemData);
                        totalAmount += serviceItemData.subTotal;
                        itemsCreated++;
                        
                        console.log(`➕ Service item added: ${serviceItemData.itemName} - ${serviceItemData.subTotal.toLocaleString()}đ`);
                    }
                }
            }

            // ✅ SỬA: Enhanced promotions processing với multiple sources
            let promotionProcessed = false;
            
            // ✅ Try processing selectedPromotions array first
            if (bookingData.selectedPromotions && Array.isArray(bookingData.selectedPromotions) && bookingData.selectedPromotions.length > 0) {
                console.log('🏷️ Processing promotion items from selectedPromotions array...', bookingData.selectedPromotions);
                
                for (const promotion of bookingData.selectedPromotions) {
                    const discountPercent = promotion.discountPercent || 0;
                    if (discountPercent > 0) {
                        const discountAmount = Math.abs((totalAmount * discountPercent) / 100);
                        
                        const promotionItemData = {
                            itemType: 'Promotion',
                            itemName: `Khuyến mãi: ${promotion.promotionName}`,
                            description: `Giảm ${discountPercent}% cho đơn hàng`,
                            quantity: 1,
                            unitPrice: discountAmount,
                            subTotal: discountAmount, // ✅ Store as positive for constraint
                            itemID: promotion.promotionID
                        };

                        await this.createInvoiceItem(transaction, invoiceID, promotionItemData);
                        totalAmount -= discountAmount; // ✅ Subtract from total
                        itemsCreated++;
                        promotionProcessed = true;
                        
                        console.log(`➕ Promotion item added: ${promotionItemData.itemName} - -${discountAmount.toLocaleString()}đ`);
                    }
                }
            }
            
            // ✅ Fallback: Try appliedPromotion object
            if (!promotionProcessed && bookingData.appliedPromotion) {
                console.log('🏷️ Processing promotion from appliedPromotion object...', bookingData.appliedPromotion);
                
                const promotion = bookingData.appliedPromotion;
                const discountPercent = promotion.discountPercent || 0;
                
                if (discountPercent > 0) {
                    const discountAmount = Math.abs((totalAmount * discountPercent) / 100);
                    
                    const promotionItemData = {
                        itemType: 'Promotion',
                        itemName: `Khuyến mãi: ${promotion.promotionName}`,
                        description: `Giảm ${discountPercent}% cho đơn hàng`,
                        quantity: 1,
                        unitPrice: discountAmount,
                        subTotal: discountAmount, // ✅ Store as positive for constraint
                        itemID: promotion.promotionID
                    };

                    await this.createInvoiceItem(transaction, invoiceID, promotionItemData);
                    totalAmount -= discountAmount; // ✅ Subtract from total
                    itemsCreated++;
                    promotionProcessed = true;
                    
                    console.log(`➕ Promotion item added from appliedPromotion: ${promotionItemData.itemName} - -${discountAmount.toLocaleString()}đ`);
                }
            }
            
            // ✅ Fallback: Try promotionDiscount from pricing
            if (!promotionProcessed && bookingData.promotionDiscount && bookingData.promotionDiscount > 0) {
                console.log('🏷️ Processing promotion from promotionDiscount value...', bookingData.promotionDiscount);
                
                const discountAmount = Math.abs(bookingData.promotionDiscount);
                const promotionName = bookingData.appliedPromotionInfo?.promotionName || 'Khuyến mãi';
                
                const promotionItemData = {
                    itemType: 'Promotion',
                    itemName: `Khuyến mãi: ${promotionName}`,
                    description: `Giảm giá ${discountAmount.toLocaleString()}đ`,
                    quantity: 1,
                    unitPrice: discountAmount,
                    subTotal: discountAmount, // ✅ Store as positive for constraint
                    itemID: bookingData.appliedPromotionInfo?.promotionID || null
                };

                await this.createInvoiceItem(transaction, invoiceID, promotionItemData);
                totalAmount -= discountAmount; // ✅ Subtract from total
                itemsCreated++;
                promotionProcessed = true;
                
                console.log(`➕ Promotion item added from promotionDiscount: ${promotionItemData.itemName} - -${discountAmount.toLocaleString()}đ`);
            }

            // ✅ Update invoice total
            const finalTotal = Math.max(0, totalAmount);
            
            const updateQuery = `
                UPDATE Invoice 
                SET TotalAmount = @totalAmount, RemainingAmount = @remainingAmount 
                WHERE InvoiceID = @invoiceID
            `;
            
            const updateRequest = new mssql.Request(transaction);
            updateRequest.input('totalAmount', mssql.Decimal(10,2), finalTotal);
            updateRequest.input('remainingAmount', mssql.Decimal(10,2), finalTotal);
            updateRequest.input('invoiceID', mssql.Int, invoiceID);
            
            await updateRequest.query(updateQuery);

            await transaction.commit();
            
            console.log(`✅ Invoice created successfully with ${itemsCreated} items, promotion processed: ${promotionProcessed}`);
            
            return {
                success: true,
                invoiceId: invoiceID,
                totalAmount: finalTotal,
                itemsCreated,
                promotionProcessed,
                message: `Tạo hóa đơn thành công với ${itemsCreated} mục${promotionProcessed ? ' (có khuyến mãi)' : ''}`
            };
            
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }
            
            console.error('❌ Error creating invoice from booking data:', error);
            return {
                success: false,
                message: 'Lỗi tạo hóa đơn từ booking data: ' + error.message,
                error: error.message
            };
        }
    }

    // ✅ SỬA: Helper method để tạo invoice item - SubTotal luôn dương
    async createInvoiceItem(transaction, invoiceID, itemData) {
        const itemQuery = `
            INSERT INTO InvoiceItem (InvoiceID, ItemType, ItemName, Description, Quantity, UnitPrice, SubTotal, ItemID)
            VALUES (@invoiceID, @itemType, @itemName, @description, @quantity, @unitPrice, @subTotal, @itemID)
        `;
        
        const itemRequest = new mssql.Request(transaction);
        itemRequest.input('invoiceID', mssql.Int, invoiceID);
        itemRequest.input('itemType', mssql.NVarChar(50), itemData.itemType); // Đã đúng constraint
        itemRequest.input('itemName', mssql.NVarChar(200), itemData.itemName);
        itemRequest.input('description', mssql.NVarChar(500), itemData.description);
        itemRequest.input('quantity', mssql.Int, Math.abs(itemData.quantity) || 1); // Quantity > 0
        itemRequest.input('unitPrice', mssql.Decimal(10,2), Math.abs(itemData.unitPrice) || 0); // UnitPrice >= 0
        itemRequest.input('subTotal', mssql.Decimal(10,2), Math.abs(itemData.subTotal) || 0); // SubTotal >= 0
        itemRequest.input('itemID', mssql.Int, itemData.itemID);
        
        await itemRequest.query(itemQuery);
        
        console.log(`➕ ${itemData.itemType} item added: ${itemData.itemName} - ${Math.abs(itemData.subTotal).toLocaleString()}đ`);
    }

    // ✅ SỬA: createInvoiceFromBookingData - Sử dụng ItemType đúng constraint
    async createInvoiceFromBookingData(bookingData) {
        let transaction = null;
        
        try {
            // ✅ SỬA: Enhanced logging để debug promotion data
            console.log('🏗️ Creating invoice from booking data:', {
                bookingID: bookingData.bookingID,
                hasRoomTypes: !!bookingData.selectedRooms,
                hasServices: !!bookingData.selectedServices,
                hasPromotions: !!bookingData.selectedPromotions,
                // ✅ THÊM: Promotion specific debugging
                appliedPromotion: bookingData.appliedPromotion,
                promotionDiscount: bookingData.promotionDiscount,
                selectedPromotionsLength: bookingData.selectedPromotions?.length || 0,
                appliedPromotionInfo: bookingData.appliedPromotionInfo,
                bookingDataKeys: Object.keys(bookingData || {}),
                rawBookingData: bookingData
            });

            const pool = await this.pool;
            transaction = new mssql.Transaction(pool);
            await transaction.begin();

            // ✅ SỬA: Validate bookingID từ bookingData - chỉ sửa phần này
            const bookingID = bookingData.bookingID || bookingData.bookingId;
            if (!bookingID) {
                throw new Error('BookingID không tồn tại trong booking data');
            }

            // ✅ Create Invoice record
            const invoiceQuery = `
                INSERT INTO Invoice (BookingID, CreateAt, TotalAmount, PaymentStatus, PaidAmount, RemainingAmount)
                OUTPUT INSERTED.InvoiceID
                VALUES (@bookingID, @createAt, @totalAmount, @paymentStatus, @paidAmount, @remainingAmount)
            `;

            const invoiceRequest = new mssql.Request(transaction);
            invoiceRequest.input('bookingID', mssql.Int, bookingID);
            invoiceRequest.input('createAt', mssql.DateTime, new Date());
            invoiceRequest.input('totalAmount', mssql.Decimal(10,2), 0); // Will update after items
            invoiceRequest.input('paymentStatus', mssql.NVarChar(20), 'Pending');
            invoiceRequest.input('paidAmount', mssql.Decimal(10,2), 0);
            invoiceRequest.input('remainingAmount', mssql.Decimal(10,2), 0);

            const invoiceResult = await invoiceRequest.query(invoiceQuery);
            const invoiceID = invoiceResult.recordset[0].InvoiceID;
            
            console.log(`✅ Invoice created with ID: ${invoiceID}`);

            let totalAmount = 0;
            let itemsCreated = 0;

            // ✅ GIỮ NGUYÊN: Room processing
            if (bookingData.selectedRooms && Array.isArray(bookingData.selectedRooms)) {
                console.log('🏠 Processing room items...');
                
                const roomTypeQuery = `
                    SELECT TypeId, TypeName, BasePrice 
                    FROM RoomType 
                    WHERE TypeId IN (${bookingData.selectedRooms.map(r => `'${r.roomTypeId}'`).join(',')})
                `;
                
                const roomTypeRequest = new mssql.Request(transaction);
                const roomTypeResult = await roomTypeRequest.query(roomTypeQuery);
                
                console.log('📊 Room types from database:', roomTypeResult.recordset);
                
                const roomTypePrices = {};
                roomTypeResult.recordset.forEach(rt => {
                    roomTypePrices[rt.TypeId] = {
                        name: rt.TypeName,
                        price: rt.BasePrice
                    };
                });

                const nights = this.calculateNights(bookingData.checkInDate, bookingData.checkOutDate);
                const effectiveNights = Math.max(1, nights);
                
                console.log(`📅 Calculated ${effectiveNights} nights for pricing`);

                for (const room of bookingData.selectedRooms) {
                    const roomTypeInfo = roomTypePrices[room.roomTypeId];
                    
                    if (roomTypeInfo) {
                        const unitPrice = roomTypeInfo.price || 0;
                        const quantity = (room.quantity || 1) * effectiveNights;
                        const subTotal = unitPrice * quantity;
                        
                        const roomItemData = {
                            itemType: 'Room',
                            itemName: `${roomTypeInfo.name} x${room.quantity} (${effectiveNights} đêm)`,
                            description: `Phòng ${roomTypeInfo.name} - ${room.quantity} phòng × ${effectiveNights} đêm`,
                            quantity: quantity,
                            unitPrice: unitPrice,
                            subTotal: subTotal,
                            itemID: parseInt(room.roomTypeId)
                        };

                        await this.createInvoiceItem(transaction, invoiceID, roomItemData);
                        totalAmount += subTotal;
                        itemsCreated++;
                        
                        console.log(`➕ Room item added: ${roomItemData.itemName} - ${subTotal.toLocaleString()}đ`);
                    } else {
                        console.warn(`⚠️ Room type ${room.roomTypeId} not found in database`);
                    }
                }
            }

            // ✅ GIỮ NGUYÊN: Services processing
            if (bookingData.selectedServices && Array.isArray(bookingData.selectedServices)) {
                console.log('🛎️ Processing service items...');
                
                for (const service of bookingData.selectedServices) {
                    const serviceInfo = this.getServiceInfo(service.serviceId || service.id, bookingData.availableServices);
                    
                    if (serviceInfo) {
                        const serviceItemData = {
                            itemType: 'Service',
                            itemName: serviceInfo.serviceName || serviceInfo.name,
                            description: serviceInfo.serviceDescription || serviceInfo.description || '',
                            quantity: service.quantity || 1,
                            unitPrice: serviceInfo.servicePrice || serviceInfo.price || 0,
                            subTotal: (service.quantity || 1) * (serviceInfo.servicePrice || serviceInfo.price || 0),
                            itemID: service.serviceId || service.id
                        };

                        await this.createInvoiceItem(transaction, invoiceID, serviceItemData);
                        totalAmount += serviceItemData.subTotal;
                        itemsCreated++;
                        
                        console.log(`➕ Service item added: ${serviceItemData.itemName} - ${serviceItemData.subTotal.toLocaleString()}đ`);
                    }
                }
            }

            // ✅ SỬA: Enhanced promotions processing với multiple sources
            let promotionProcessed = false;
            
            // ✅ Try processing selectedPromotions array first
            if (bookingData.selectedPromotions && Array.isArray(bookingData.selectedPromotions) && bookingData.selectedPromotions.length > 0) {
                console.log('🏷️ Processing promotion items from selectedPromotions array...', bookingData.selectedPromotions);
                
                for (const promotion of bookingData.selectedPromotions) {
                    const discountPercent = promotion.discountPercent || 0;
                    if (discountPercent > 0) {
                        const discountAmount = Math.abs((totalAmount * discountPercent) / 100);
                        
                        const promotionItemData = {
                            itemType: 'Promotion',
                            itemName: `Khuyến mãi: ${promotion.promotionName}`,
                            description: `Giảm ${discountPercent}% cho đơn hàng`,
                            quantity: 1,
                            unitPrice: discountAmount,
                            subTotal: discountAmount, // ✅ Store as positive for constraint
                            itemID: promotion.promotionID
                        };

                        await this.createInvoiceItem(transaction, invoiceID, promotionItemData);
                        totalAmount -= discountAmount; // ✅ Subtract from total
                        itemsCreated++;
                        promotionProcessed = true;
                        
                        console.log(`➕ Promotion item added: ${promotionItemData.itemName} - -${discountAmount.toLocaleString()}đ`);
                    }
                }
            }
            
            // ✅ Fallback: Try appliedPromotion object
            if (!promotionProcessed && bookingData.appliedPromotion) {
                console.log('🏷️ Processing promotion from appliedPromotion object...', bookingData.appliedPromotion);
                
                const promotion = bookingData.appliedPromotion;
                const discountPercent = promotion.discountPercent || 0;
                
                if (discountPercent > 0) {
                    const discountAmount = Math.abs((totalAmount * discountPercent) / 100);
                    
                    const promotionItemData = {
                        itemType: 'Promotion',
                        itemName: `Khuyến mãi: ${promotion.promotionName}`,
                        description: `Giảm ${discountPercent}% cho đơn hàng`,
                        quantity: 1,
                        unitPrice: discountAmount,
                        subTotal: discountAmount, // ✅ Store as positive for constraint
                        itemID: promotion.promotionID
                    };

                    await this.createInvoiceItem(transaction, invoiceID, promotionItemData);
                    totalAmount -= discountAmount; // ✅ Subtract from total
                    itemsCreated++;
                    promotionProcessed = true;
                    
                    console.log(`➕ Promotion item added from appliedPromotion: ${promotionItemData.itemName} - -${discountAmount.toLocaleString()}đ`);
                }
            }
            
            // ✅ Fallback: Try promotionDiscount from pricing
            if (!promotionProcessed && bookingData.promotionDiscount && bookingData.promotionDiscount > 0) {
                console.log('🏷️ Processing promotion from promotionDiscount value...', bookingData.promotionDiscount);
                
                const discountAmount = Math.abs(bookingData.promotionDiscount);
                const promotionName = bookingData.appliedPromotionInfo?.promotionName || 'Khuyến mãi';
                
                const promotionItemData = {
                    itemType: 'Promotion',
                    itemName: `Khuyến mãi: ${promotionName}`,
                    description: `Giảm giá ${discountAmount.toLocaleString()}đ`,
                    quantity: 1,
                    unitPrice: discountAmount,
                    subTotal: discountAmount, // ✅ Store as positive for constraint
                    itemID: bookingData.appliedPromotionInfo?.promotionID || null
                };

                await this.createInvoiceItem(transaction, invoiceID, promotionItemData);
                totalAmount -= discountAmount; // ✅ Subtract from total
                itemsCreated++;
                promotionProcessed = true;
                
                console.log(`➕ Promotion item added from promotionDiscount: ${promotionItemData.itemName} - -${discountAmount.toLocaleString()}đ`);
            }

            // ✅ Update invoice total
            const finalTotal = Math.max(0, totalAmount);
            
            const updateQuery = `
                UPDATE Invoice 
                SET TotalAmount = @totalAmount, RemainingAmount = @remainingAmount 
                WHERE InvoiceID = @invoiceID
            `;
            
            const updateRequest = new mssql.Request(transaction);
            updateRequest.input('totalAmount', mssql.Decimal(10,2), finalTotal);
            updateRequest.input('remainingAmount', mssql.Decimal(10,2), finalTotal);
            updateRequest.input('invoiceID', mssql.Int, invoiceID);
            
            await updateRequest.query(updateQuery);

            await transaction.commit();
            
            console.log(`✅ Invoice created successfully with ${itemsCreated} items, promotion processed: ${promotionProcessed}`);
            
            return {
                success: true,
                invoiceId: invoiceID,
                totalAmount: finalTotal,
                itemsCreated,
                promotionProcessed,
                message: `Tạo hóa đơn thành công với ${itemsCreated} mục${promotionProcessed ? ' (có khuyến mãi)' : ''}`
            };
            
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }
            
            console.error('❌ Error creating invoice from booking data:', error);
            return {
                success: false,
                message: 'Lỗi tạo hóa đơn từ booking data: ' + error.message,
                error: error.message
            };
        }
    }

    // ✅ THÊM: Helper methods
    calculateTotalFromBookingData(bookingData) {
        let roomSubtotal = 0;
        let servicesSubtotal = 0;
        let lateCheckoutFee = 0;
        let promotionDiscount = 0;
        
        // Calculate room subtotal
        if (bookingData.selectedRooms) {
            const nights = this.calculateNights(bookingData.checkInDate, bookingData.checkOutDate);
            roomSubtotal = bookingData.selectedRooms.reduce((total, room) => {
                const price = this.getRoomTypePrice(room.roomTypeId, bookingData.roomTypes);
                return total + (price * (room.quantity || 1) * nights);
            }, 0);
        }
        
        // Calculate services subtotal
        if (bookingData.selectedServices && bookingData.availableServices) {
            servicesSubtotal = bookingData.selectedServices.reduce((total, serviceId) => {
                const service = bookingData.availableServices.find(s => s.id === serviceId);
                return total + (service?.price || 0);
            }, 0);
        }
        
        // Calculate late checkout fee từ pricing
        if (bookingData.pricing?.lateCheckoutFee) {
            lateCheckoutFee = bookingData.pricing.lateCheckoutFee;
        }
        
        // Calculate promotion discount
        if (bookingData.selectedPromotions && bookingData.selectedPromotions.length > 0) {
            const subtotal = roomSubtotal + servicesSubtotal + lateCheckoutFee;
            promotionDiscount = bookingData.selectedPromotions.reduce((total, promotion) => {
                return total + (subtotal * (promotion.discountPercent || 0) / 100);
            }, 0);
        }
        
        const finalTotal = Math.max(0, roomSubtotal + servicesSubtotal + lateCheckoutFee - promotionDiscount);
        
        return {
            roomSubtotal,
            servicesSubtotal,
            lateCheckoutFee,
            promotionDiscount,
            finalTotal
        };
    }

    calculateNights(checkIn, checkOut) {
        if (!checkIn || !checkOut) return 1;
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
        return Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    }

    getRoomTypeName(roomTypeId, roomTypes) {
        if (!roomTypes) return 'Unknown Room Type';
        const roomType = roomTypes.find(rt => rt.id === String(roomTypeId));
        return roomType?.name || 'Unknown Room Type';
    }

    getRoomTypePrice(roomTypeId, roomTypes) {
        if (!roomTypes) return 0;
        const roomType = roomTypes.find(rt => rt.id === String(roomTypeId));
        return roomType?.price || 0;
    }

    getServiceInfo(serviceId, availableServices) {
        if (!availableServices) return null;
        return availableServices.find(s => s.id === serviceId) || null;
    }

// ✅ REVENUE REPORT METHODS
    
    /**
     * Get revenue report by period (week, month, quarter)
     */
    async getRevenueReport(period = 'week', range = '', year = new Date().getFullYear()) {
        try {
            const pool = await this.pool;
            
            let dateCondition = '';
            let groupByClause = '';
            let selectFields = '';
            
            // Determine date range and grouping based on period
            switch (period) {
                case 'week':
                    if (range) {
                        const weekNumber = parseInt(range);
                        dateCondition = `WHERE YEAR(i.CreateAt) = @year AND DATEPART(WEEK, i.CreateAt) = @weekNumber`;
                        groupByClause = `GROUP BY DATEPART(WEEKDAY, i.CreateAt), DATENAME(WEEKDAY, i.CreateAt)`;
                        selectFields = `DATENAME(WEEKDAY, i.CreateAt) as PeriodLabel, DATEPART(WEEKDAY, i.CreateAt) as PeriodOrder`;
                    } else {
                        dateCondition = `WHERE i.CreateAt >= DATEADD(WEEK, -4, GETDATE())`;
                        groupByClause = `GROUP BY DATEPART(WEEK, i.CreateAt), YEAR(i.CreateAt)`;
                        selectFields = `'Tuần ' + CAST(DATEPART(WEEK, i.CreateAt) AS NVARCHAR) as PeriodLabel, DATEPART(WEEK, i.CreateAt) as PeriodOrder`;
                    }
                    break;
                    
                case 'month':
                    if (range) {
                        const monthNumber = parseInt(range);
                        dateCondition = `WHERE YEAR(i.CreateAt) = @year AND MONTH(i.CreateAt) = @monthNumber`;
                        groupByClause = `GROUP BY DATEPART(WEEK, i.CreateAt)`;
                        selectFields = `'Tuần ' + CAST(DATEPART(WEEK, i.CreateAt) AS NVARCHAR) as PeriodLabel, DATEPART(WEEK, i.CreateAt) as PeriodOrder`;
                    } else {
                        dateCondition = `WHERE i.CreateAt >= DATEADD(MONTH, -6, GETDATE())`;
                        groupByClause = `GROUP BY MONTH(i.CreateAt), YEAR(i.CreateAt), DATENAME(MONTH, i.CreateAt)`;
                        selectFields = `DATENAME(MONTH, i.CreateAt) + ' ' + CAST(YEAR(i.CreateAt) AS NVARCHAR) as PeriodLabel, MONTH(i.CreateAt) as PeriodOrder`;
                    }
                    break;
                    
                case 'quarter':
                    if (range) {
                        const quarterNumber = parseInt(range);
                        dateCondition = `WHERE YEAR(i.CreateAt) = @year AND DATEPART(QUARTER, i.CreateAt) = @quarterNumber`;
                        groupByClause = `GROUP BY MONTH(i.CreateAt), DATENAME(MONTH, i.CreateAt)`;
                        selectFields = `DATENAME(MONTH, i.CreateAt) as PeriodLabel, MONTH(i.CreateAt) as PeriodOrder`;
                    } else {
                        dateCondition = `WHERE i.CreateAt >= DATEADD(QUARTER, -4, GETDATE())`;
                        groupByClause = `GROUP BY DATEPART(QUARTER, i.CreateAt), YEAR(i.CreateAt)`;
                        selectFields = `'Quý ' + CAST(DATEPART(QUARTER, i.CreateAt) AS NVARCHAR) + ' ' + CAST(YEAR(i.CreateAt) AS NVARCHAR) as PeriodLabel, DATEPART(QUARTER, i.CreateAt) as PeriodOrder`;
                    }
                    break;
            }

            const query = `
                SELECT 
                    ${selectFields},
                    SUM(CASE WHEN ii.ItemType = 'Room' AND ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as RoomRevenue,
                    SUM(CASE WHEN ii.ItemType = 'Service' AND ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as ServiceRevenue,
                    SUM(CASE WHEN ii.ItemType NOT IN ('Room', 'Service') AND ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as OtherRevenue,
                    SUM(CASE WHEN ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as TotalRevenue,
                    COUNT(DISTINCT i.InvoiceID) as InvoiceCount,
                    COUNT(DISTINCT i.BookingID) as BookingCount
                FROM Invoice i
                INNER JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                ${dateCondition}
                AND i.PaymentStatus IN ('Paid', 'Partial')
                ${groupByClause}
                ORDER BY PeriodOrder
            `;

            const request = pool.request();
            
            if (period === 'week' && range) {
                request.input('weekNumber', parseInt(range));
            }
            if (period === 'month' && range) {
                request.input('monthNumber', parseInt(range));
            }
            if (period === 'quarter' && range) {
                request.input('quarterNumber', parseInt(range));
            }
            if (year) {
                request.input('year', parseInt(year));
            }

            const result = await request.query(query);

            // Calculate totals
            const totals = {
                roomTotal: result.recordset.reduce((sum, row) => sum + (row.RoomRevenue || 0), 0),
                serviceTotal: result.recordset.reduce((sum, row) => sum + (row.ServiceRevenue || 0), 0),
                otherTotal: result.recordset.reduce((sum, row) => sum + (row.OtherRevenue || 0), 0),
                grandTotal: result.recordset.reduce((sum, row) => sum + (row.TotalRevenue || 0), 0),
                totalInvoices: result.recordset.reduce((sum, row) => sum + (row.InvoiceCount || 0), 0),
                totalBookings: result.recordset.reduce((sum, row) => sum + (row.BookingCount || 0), 0)
            };

            return {
                success: true,
                data: {
                    period,
                    range,
                    year,
                    details: result.recordset,
                    totals,
                    labels: result.recordset.map(row => row.PeriodLabel),
                    roomData: result.recordset.map(row => row.RoomRevenue || 0),
                    serviceData: result.recordset.map(row => row.ServiceRevenue || 0),
                    otherData: result.recordset.map(row => row.OtherRevenue || 0),
                    totalData: result.recordset.map(row => row.TotalRevenue || 0)
                }
            };

        } catch (error) {
            console.error('❌ Error getting revenue report:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy báo cáo doanh thu',
                error: error.message
            };
        }
    }

    /**
     * Get detailed revenue report with custom date range
     */
    async getDetailedRevenueReport(startDate, endDate, groupBy = 'month') {
        try {
            const pool = await this.pool;
            
            let groupByClause = '';
            let selectFields = '';
            
            switch (groupBy) {
                case 'week':
                    groupByClause = `GROUP BY DATEPART(WEEK, i.CreateAt), YEAR(i.CreateAt)`;
                    selectFields = `'Tuần ' + CAST(DATEPART(WEEK, i.CreateAt) AS NVARCHAR) + '/' + CAST(YEAR(i.CreateAt) AS NVARCHAR) as PeriodLabel, 
                                   DATEPART(WEEK, i.CreateAt) as PeriodOrder, YEAR(i.CreateAt) as YearOrder`;
                    break;
                case 'month':
                    groupByClause = `GROUP BY MONTH(i.CreateAt), YEAR(i.CreateAt), DATENAME(MONTH, i.CreateAt)`;
                    selectFields = `DATENAME(MONTH, i.CreateAt) + ' ' + CAST(YEAR(i.CreateAt) AS NVARCHAR) as PeriodLabel, 
                                   MONTH(i.CreateAt) as PeriodOrder, YEAR(i.CreateAt) as YearOrder`;
                    break;
                case 'quarter':
                    groupByClause = `GROUP BY DATEPART(QUARTER, i.CreateAt), YEAR(i.CreateAt)`;
                    selectFields = `'Quý ' + CAST(DATEPART(QUARTER, i.CreateAt) AS NVARCHAR) + ' ' + CAST(YEAR(i.CreateAt) AS NVARCHAR) as PeriodLabel, 
                                   DATEPART(QUARTER, i.CreateAt) as PeriodOrder, YEAR(i.CreateAt) as YearOrder`;
                    break;
            }

            const query = `
                SELECT 
                    ${selectFields},
                    SUM(CASE WHEN ii.ItemType = 'Room' AND ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as RoomRevenue,
                    SUM(CASE WHEN ii.ItemType = 'Service' AND ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as ServiceRevenue,
                    SUM(CASE WHEN ii.ItemType NOT IN ('Room', 'Service') AND ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as OtherRevenue,
                    SUM(CASE WHEN ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as TotalRevenue,
                    COUNT(DISTINCT i.InvoiceID) as InvoiceCount,
                    COUNT(DISTINCT i.BookingID) as BookingCount,
                    AVG(i.TotalAmount) as AverageInvoiceAmount
                FROM Invoice i
                INNER JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                WHERE i.CreateAt >= @startDate 
                AND i.CreateAt <= @endDate
                AND i.PaymentStatus IN ('Paid', 'Partial')
                ${groupByClause}
                ORDER BY YearOrder, PeriodOrder
            `;

            const request = pool.request()
                .input('startDate', startDate)
                .input('endDate', endDate);

            const result = await request.query(query);

            // Get top performing items for the period
            const topItemsQuery = `
                SELECT TOP 10
                    ii.ItemName,
                    ii.ItemType,
                    SUM(ii.Quantity) as TotalQuantity,
                    SUM(ii.SubTotal) as TotalRevenue,
                    COUNT(DISTINCT i.InvoiceID) as InvoiceCount,
                    AVG(ii.UnitPrice) as AveragePrice
                FROM Invoice i
                INNER JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                WHERE i.CreateAt >= @startDate 
                AND i.CreateAt <= @endDate
                AND i.PaymentStatus IN ('Paid', 'Partial')
                GROUP BY ii.ItemName, ii.ItemType
                ORDER BY TotalRevenue DESC
            `;

            const topItemsResult = await request.query(topItemsQuery);

            // Calculate totals and growth
            const totals = {
                roomTotal: result.recordset.reduce((sum, row) => sum + (row.RoomRevenue || 0), 0),
                serviceTotal: result.recordset.reduce((sum, row) => sum + (row.ServiceRevenue || 0), 0),
                otherTotal: result.recordset.reduce((sum, row) => sum + (row.OtherRevenue || 0), 0),
                grandTotal: result.recordset.reduce((sum, row) => sum + (row.TotalRevenue || 0), 0),
                totalInvoices: result.recordset.reduce((sum, row) => sum + (row.InvoiceCount || 0), 0),
                totalBookings: result.recordset.reduce((sum, row) => sum + (row.BookingCount || 0), 0),
                averageInvoice: result.recordset.length > 0 ? 
                    result.recordset.reduce((sum, row) => sum + (row.AverageInvoiceAmount || 0), 0) / result.recordset.length : 0
            };
            return {
                success: true,
                data: {
                    startDate,
                    endDate,
                    groupBy,
                    details: result.recordset,
                    totals,
                    labels: result.recordset.map(row => row.PeriodLabel),
                    roomData: result.recordset.map(row => row.RoomRevenue || 0),
                    serviceData: result.recordset.map(row => row.ServiceRevenue || 0),
                    otherData: result.recordset.map(row => row.OtherRevenue || 0),
                    totalData: result.recordset.map(row => row.TotalRevenue || 0),
                    topItems: topItemsResult.recordset
                }
            };
        } catch (error) {
            console.error('❌ Error getting detailed revenue report:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy báo cáo chi tiết doanh thu',
                error: error.message
            };
        }
    }
 /**
     * Get revenue statistics for dashboard
     */
    async getRevenueStatistics(startDate, endDate) {
        try {
            const pool = await this.pool;
            
            const query = `
                WITH RevenueStats AS (
                    SELECT 
                        SUM(CASE WHEN ii.ItemType = 'Room' AND ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as RoomRevenue,
                        SUM(CASE WHEN ii.ItemType = 'Service' AND ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as ServiceRevenue,
                        SUM(CASE WHEN ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as TotalRevenue,
                        COUNT(DISTINCT i.InvoiceID) as TotalInvoices,
                        COUNT(DISTINCT i.BookingID) as TotalBookings,
                        AVG(i.TotalAmount) as AvgInvoiceAmount
                    FROM Invoice i
                    INNER JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                    WHERE i.CreateAt >= @startDate 
                    AND i.CreateAt <= @endDate
                    AND i.PaymentStatus IN ('Paid', 'Partial')
                ),
                DailyTrend AS (
                    SELECT 
                        CAST(i.CreateAt AS DATE) as RevenueDate,
                        SUM(CASE WHEN ii.SubTotal > 0 THEN ii.SubTotal ELSE 0 END) as DailyRevenue
                    FROM Invoice i
                    INNER JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                    WHERE i.CreateAt >= @startDate 
                    AND i.CreateAt <= @endDate
                    AND i.PaymentStatus IN ('Paid', 'Partial')
                    GROUP BY CAST(i.CreateAt AS DATE)
                ),
                PaymentStatusBreakdown AS (
                    SELECT 
                        i.PaymentStatus,
                        COUNT(*) as StatusCount,
                        SUM(i.TotalAmount) as StatusRevenue
                    FROM Invoice i
                    WHERE i.CreateAt >= @startDate 
                    AND i.CreateAt <= @endDate
                    GROUP BY i.PaymentStatus
                )
                SELECT 
                    (SELECT RoomRevenue FROM RevenueStats) as RoomRevenue,
                    (SELECT ServiceRevenue FROM RevenueStats) as ServiceRevenue,
                    (SELECT TotalRevenue FROM RevenueStats) as TotalRevenue,
                    (SELECT TotalInvoices FROM RevenueStats) as TotalInvoices,
                    (SELECT TotalBookings FROM RevenueStats) as TotalBookings,
                    (SELECT AvgInvoiceAmount FROM RevenueStats) as AvgInvoiceAmount
            `;

            const request = pool.request()
                .input('startDate', startDate)
                .input('endDate', endDate);

            const result = await request.query(query);

            // Get daily trend
            const trendQuery = `
                SELECT 
                    CAST(i.CreateAt AS DATE) as RevenueDate,
                    SUM(ii.SubTotal) as DailyRevenue,
                    COUNT(DISTINCT i.InvoiceID) as DailyInvoices
                FROM Invoice i
                INNER JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                WHERE i.CreateAt >= @startDate 
                AND i.CreateAt <= @endDate
                AND i.PaymentStatus IN ('Paid', 'Partial')
                GROUP BY CAST(i.CreateAt AS DATE)
                ORDER BY RevenueDate
            `;

            const trendResult = await request.query(trendQuery);

            // Get payment status breakdown
            const statusQuery = `
                SELECT 
                    i.PaymentStatus,
                    COUNT(*) as StatusCount,
                    SUM(i.TotalAmount) as StatusRevenue
                FROM Invoice i
                WHERE i.CreateAt >= @startDate 
                AND i.CreateAt <= @endDate
                GROUP BY i.PaymentStatus
            `;

            const statusResult = await request.query(statusQuery);

            const stats = result.recordset[0] || {};

            return {
                success: true,
                data: {
                    summary: {
                        totalRevenue: stats.TotalRevenue || 0,
                        roomRevenue: stats.RoomRevenue || 0,
                        serviceRevenue: stats.ServiceRevenue || 0,
                        totalInvoices: stats.TotalInvoices || 0,
                        totalBookings: stats.TotalBookings || 0,
                        averageInvoiceAmount: stats.AvgInvoiceAmount || 0
                    },
                    dailyTrend: trendResult.recordset,
                    paymentStatusBreakdown: statusResult.recordset,
                    period: {
                        startDate,
                        endDate
                    }
                }
            };

        } catch (error) {
            console.error('❌ Error getting revenue statistics:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy thống kê doanh thu',
                error: error.message
            };
        }
    }

    /**
     * Get top performing items
     */
    async getTopPerformingItems(startDate, endDate, limit = 10, itemType = 'all') {
        try {
            const pool = await this.pool;
            
            let itemTypeFilter = '';
            if (itemType && itemType !== 'all') {
                itemTypeFilter = `AND ii.ItemType = @itemType`;
            }

            const query = `
                SELECT TOP (@limit)
                    ii.ItemName,
                    ii.ItemType,
                    SUM(ii.Quantity) as TotalQuantity,
                    SUM(ii.SubTotal) as TotalRevenue,
                    COUNT(DISTINCT i.InvoiceID) as InvoiceCount,
                    AVG(ii.UnitPrice) as AveragePrice,
                    MIN(ii.UnitPrice) as MinPrice,
                    MAX(ii.UnitPrice) as MaxPrice,
                    COUNT(DISTINCT i.BookingID) as BookingCount,
                    CAST(SUM(ii.SubTotal) * 100.0 / 
                        (SELECT SUM(SubTotal) FROM InvoiceItem ii2 
                         INNER JOIN Invoice i2 ON ii2.InvoiceID = i2.InvoiceID
                         WHERE i2.CreateAt >= @startDate AND i2.CreateAt <= @endDate
                         AND i2.PaymentStatus IN ('Paid', 'Partial')) AS DECIMAL(5,2)) as RevenuePercentage
                FROM Invoice i
                INNER JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                WHERE i.CreateAt >= @startDate 
                AND i.CreateAt <= @endDate
                AND i.PaymentStatus IN ('Paid', 'Partial')
                ${itemTypeFilter}
                GROUP BY ii.ItemName, ii.ItemType
                ORDER BY TotalRevenue DESC
            `;

            const request = pool.request()
                .input('startDate', startDate)
                .input('endDate', endDate)
                .input('limit', parseInt(limit));

            if (itemType && itemType !== 'all') {
                request.input('itemType', itemType);
            }

            const result = await request.query(query);

            return {
                success: true,
                data: {
                    items: result.recordset,
                    period: { startDate, endDate },
                    itemType,
                    limit: parseInt(limit)
                }
            };

        } catch (error) {
            console.error('❌ Error getting top performing items:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy danh sách item hiệu suất cao',
                error: error.message
            };
        }
    }

    /**
     * Get monthly comparison between years
     */
    async getMonthlyComparison(currentYear, compareYear) {
        try {
            const pool = await this.pool;
            
            const query = `
                WITH CurrentYearData AS (
                    SELECT 
                        MONTH(i.CreateAt) as Month,
                        DATENAME(MONTH, i.CreateAt) as MonthName,
                        SUM(ii.SubTotal) as Revenue,
                        COUNT(DISTINCT i.InvoiceID) as InvoiceCount
                    FROM Invoice i
                    INNER JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                    WHERE YEAR(i.CreateAt) = @currentYear
                    AND i.PaymentStatus IN ('Paid', 'Partial')
                    GROUP BY MONTH(i.CreateAt), DATENAME(MONTH, i.CreateAt)
                ),
                CompareYearData AS (
                    SELECT 
                        MONTH(i.CreateAt) as Month,
                        DATENAME(MONTH, i.CreateAt) as MonthName,
                        SUM(ii.SubTotal) as Revenue,
                        COUNT(DISTINCT i.InvoiceID) as InvoiceCount
                    FROM Invoice i
                    INNER JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                    WHERE YEAR(i.CreateAt) = @compareYear
                    AND i.PaymentStatus IN ('Paid', 'Partial')
                    GROUP BY MONTH(i.CreateAt), DATENAME(MONTH, i.CreateAt)
                )
                SELECT 
                    c.Month,
                    c.MonthName,
                    ISNULL(c.Revenue, 0) as CurrentYearRevenue,
                    ISNULL(c.InvoiceCount, 0) as CurrentYearInvoices,
                    ISNULL(p.Revenue, 0) as CompareYearRevenue,
                    ISNULL(p.InvoiceCount, 0) as CompareYearInvoices,
                    CASE 
                        WHEN ISNULL(p.Revenue, 0) = 0 THEN 100
                        ELSE CAST((ISNULL(c.Revenue, 0) - ISNULL(p.Revenue, 0)) * 100.0 / ISNULL(p.Revenue, 1) AS DECIMAL(10,2))
                    END as GrowthPercentage
                FROM CurrentYearData c
                FULL OUTER JOIN CompareYearData p ON c.Month = p.Month
                ORDER BY ISNULL(c.Month, p.Month)
            `;

            const request = pool.request()
                .input('currentYear', parseInt(currentYear))
                .input('compareYear', parseInt(compareYear));

            const result = await request.query(query);

            // Calculate totals
            const currentYearTotal = result.recordset.reduce((sum, row) => sum + (row.CurrentYearRevenue || 0), 0);
            const compareYearTotal = result.recordset.reduce((sum, row) => sum + (row.CompareYearRevenue || 0), 0);
            const overallGrowth = compareYearTotal === 0 ? 100 : 
                ((currentYearTotal - compareYearTotal) * 100.0 / compareYearTotal);

            return {
                success: true,
                data: {
                    currentYear: parseInt(currentYear),
                    compareYear: parseInt(compareYear),
                    monthlyData: result.recordset,
                    summary: {
                        currentYearTotal,
                        compareYearTotal,
                        overallGrowth: Math.round(overallGrowth * 100) / 100,
                        totalInvoicesCurrentYear: result.recordset.reduce((sum, row) => sum + (row.CurrentYearInvoices || 0), 0),
                        totalInvoicesCompareYear: result.recordset.reduce((sum, row) => sum + (row.CompareYearInvoices || 0), 0)
                    }
                }
            };

        } catch (error) {
            console.error('❌ Error getting monthly comparison:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy so sánh theo tháng',
                error: error.message
            };
        }
    }

    /**
     * Debug method to get negative revenue data
     */
    async getNegativeRevenueData() {
        try {
            const pool = await this.pool;
            
            const query = `
                SELECT 
                    i.InvoiceID,
                    i.CreateAt,
                    i.PaymentStatus as Status,
                    ii.InvoiceItemID,
                    ii.ItemType,
                    ii.ItemName,
                    ii.Quantity,
                    ii.UnitPrice as Price,
                    ii.SubTotal,
                    CASE 
                        WHEN ii.ItemType = 'Service' THEN s.ServiceName
                        WHEN ii.ItemType = 'Room' THEN rt.TypeName
                        ELSE 'Unknown'
                    END as ActualItemName
                FROM Invoice i
                INNER JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                LEFT JOIN Service s ON ii.ItemType = 'Service' AND ii.ItemName = s.ServiceName
                LEFT JOIN RoomType rt ON ii.ItemType = 'Room' AND ii.ItemName = rt.TypeName
                WHERE ii.SubTotal < 0
                ORDER BY i.CreateAt DESC, ii.SubTotal ASC
            `;

            const result = await pool.request().query(query);
            
            return {
                success: true,
                data: result.recordset
            };

        } catch (error) {
            console.error('❌ Error getting negative revenue data:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy dữ liệu doanh thu âm',
                error: error.message
            };
        }
    }

    /**
     * Debug method to get raw invoice data for analysis
     */
    async getRawInvoiceData(limit = 50) {
        try {
            const pool = await this.pool;
            
            const query = `
                SELECT TOP (${limit})
                    i.InvoiceID,
                    i.CreateAt,
                    i.PaymentStatus as Status,
                    i.TotalAmount as InvoiceTotal,
                    ii.InvoiceItemID,
                    ii.ItemType,
                    ii.ItemName,
                    ii.Quantity,
                    ii.UnitPrice as Price,
                    ii.SubTotal,
                    CASE 
                        WHEN ii.ItemType = 'Service' THEN 
                            CONCAT('Service: ', ISNULL(s.ServiceName, 'NOT_FOUND'))
                        WHEN ii.ItemType = 'Room' THEN 
                            CONCAT('Room: ', ISNULL(rt.TypeName, 'NOT_FOUND'))
                        ELSE 
                            CONCAT('Other: ', ii.ItemName)
                    END as ItemDetails
                FROM Invoice i
                INNER JOIN InvoiceItem ii ON i.InvoiceID = ii.InvoiceID
                LEFT JOIN Service s ON ii.ItemType = 'Service' AND ii.ItemName = s.ServiceName
                LEFT JOIN RoomType rt ON ii.ItemType = 'Room' AND ii.ItemName = rt.TypeName
                ORDER BY i.CreateAt DESC
            `;

            const result = await pool.request().query(query);
            
            // Calculate some statistics
            const stats = {
                totalItems: result.recordset.length,
                negativeItems: result.recordset.filter(item => item.SubTotal < 0).length,
                zeroItems: result.recordset.filter(item => item.SubTotal === 0).length,
                positiveItems: result.recordset.filter(item => item.SubTotal > 0).length,
                serviceItems: result.recordset.filter(item => item.ItemType === 'Service').length,
                roomItems: result.recordset.filter(item => item.ItemType === 'Room').length,
                otherItems: result.recordset.filter(item => !['Service', 'Room'].includes(item.ItemType)).length
            };
            
            return {
                success: true,
                data: result.recordset,
                statistics: stats
            };

        } catch (error) {
            console.error('❌ Error getting raw invoice data:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy dữ liệu hóa đơn thô',
                error: error.message
            };
        }
    }
}
export default InvoiceDBContext;