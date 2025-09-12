class IntentClassifier {
    constructor() {
        // ✅ Navigation keywords - Điều hướng
        this.navigationKeywords = [
            'đi tới', 'đi đến', 'chuyển tới', 'chuyển đến', 'navigate to', 'go to',
            'mở trang', 'vào trang', 'open page', 'access page',
            'điều hướng', 'navigation', 'redirect', 'chuyển hướng',
            'đưa tôi đến', 'đưa tôi tới', 'cho tôi đi', 'take me to',
            'hiển thị trang', 'show page', 'mở ra', 'open up',
            'trang chủ của', 'home page of', 'đi đến trang chủ', 'go to home',
            'đi đến dashboard', 'mở dashboard', 'vào dashboard',
            'đi đến hồ sơ', 'mở hồ sơ', 'vào profile', 'open profile',
            'đi đến quản lý', 'mở trang quản lý', 'manager page',
            'đi đến lễ tân', 'mở trang lễ tân', 'receptionist page'
        ];

        // ✅ Direct prompt keywords - Yêu cầu trực tiếp AI
        this.promptKeywords = [
            'viết email', 'viết thư', 'viết mô tả', 'tạo nội dung',
            'hướng dẫn', 'guide', 'how to', 'cách', 'làm thế nào',
            'phân tích', 'analysis', 'so sánh', 'compare',
            'lập kế hoạch', 'plan', 'planning', 'kế hoạch',
            'chuẩn bị đồ', 'what to bring', 'pack', 'packing',
            'thời tiết theo mùa', 'seasonal weather', 'climate guide',
            'tư vấn', 'advise', 'recommend', 'gợi ý',
            'giải thích', 'explain', 'elaborate', 'mô tả chi tiết'
        ];

        // ✅ Database query keywords - Truy vấn cơ sở dữ liệu
        this.databaseQueryKeywords = {
            // Rooms & Room Types
            rooms: [
                'xem phòng', 'kiểm tra phòng', 'tình trạng phòng', 'phòng trống',
                'phòng còn', 'available rooms', 'room status', 'check rooms',
                'loại phòng', 'room type', 'room category', 'phân loại phòng',
                'capacity', 'sức chứa', 'số người', 'occupancy'
            ],
            
            // Pricing & Promotions
            pricing: [
                'bảng giá', 'giá phòng', 'pricing', 'price list', 'room rates',
                'khuyến mãi', 'promotion', 'offer', 'discount', 'deal',
                'ưu đãi', 'special offer', 'voucher', 'coupon'
            ],
            
            // Bookings
            bookings: [
                'booking', 'đặt phòng', 'reservation', 'book room',
                'check in', 'check out', 'nhận phòng', 'trả phòng',
                'guest', 'khách hàng', 'customer', 'visitor'
            ],
            
            // Services & Amenities
            services: [
                'dịch vụ', 'service', 'amenity', 'facility',
                'tiện nghi', 'convenience', 'utilities', 'features',
                'spa', 'gym', 'pool', 'restaurant', 'wifi'
            ],
            
            // Reports & Statistics
            reports: [
                'thống kê', 'báo cáo', 'report', 'statistics',
                'analytics', 'phân tích', 'revenue', 'doanh thu',
                'occupancy rate', 'tỷ lệ lấp đầy', 'performance'
            ],
            
            // Staff & Users
            staff: [
                'nhân viên', 'staff', 'employee', 'user',
                'tài khoản', 'account', 'role', 'quyền',
                'permission', 'access', 'login'
            ],
            
            // Weather & Location
            weather: [
                'thời tiết', 'weather', 'forecast', 'climate',
                'nhiệt độ', 'temperature', 'mưa', 'rain', 'nắng', 'sunny'
            ],
            
            // Payments
            payments: [
                'thanh toán', 'payment', 'bill', 'invoice',
                'hóa đơn', 'receipt', 'transaction', 'money'
            ]
        };

        // ✅ Intent priority matrix
        this.intentPriority = {
            navigation: 1,      // Highest priority
            database_query: 2,  // Second priority
            prompt: 3,          // Third priority
            chat: 4            // Default chat
        };

        // ✅ Context-aware keywords for different roles
        this.roleSpecificKeywords = {
            manager: [
                'dashboard', 'quản lý', 'admin', 'statistics', 'reports',
                'revenue', 'profit', 'staff management', 'system settings',
                'performance', 'analytics', 'overview', 'control panel'
            ],
            receptionist: [
                'check in', 'check out', 'booking', 'guest', 'front desk',
                'reception', 'customer service', 'walk-in', 'reservation',
                'room assignment', 'key card', 'luggage'
            ],
            customer: [
                'book room', 'availability', 'pricing', 'amenities',
                'location', 'nearby', 'tourist', 'vacation', 'holiday',
                'facilities', 'room service', 'spa', 'restaurant'
            ]
        };
    }

    // ✅ Main intent classification method
    classifyIntent(message, userRole = 'customer', context = {}) {
        const lowerMessage = message.toLowerCase();
        
        console.log('🎯 Classifying intent for:', {
            message: message.substring(0, 50) + '...',
            userRole,
            hasContext: Object.keys(context).length > 0
        });

        // Step 1: Check for navigation intent
        if (this.detectNavigationPrompt(lowerMessage)) {
            return {
                type: 'navigation',
                priority: this.intentPriority.navigation,
                confidence: 0.95,
                subtype: 'page_navigation',
                keywords: this.getMatchedKeywords(lowerMessage, this.navigationKeywords)
            };
        }

        // Step 2: Check for database query intent
        const dbQueryResult = this.detectDatabaseQuery(lowerMessage, userRole);
        if (dbQueryResult.hasMatch) {
            return {
                type: 'database_query',
                priority: this.intentPriority.database_query,
                confidence: dbQueryResult.confidence,
                subtype: dbQueryResult.category,
                keywords: dbQueryResult.keywords,
                queryType: dbQueryResult.queryType
            };
        }

        // Step 3: Check for direct prompt intent
        if (this.detectDirectPrompt(lowerMessage)) {
            return {
                type: 'prompt',
                priority: this.intentPriority.prompt,
                confidence: 0.8,
                subtype: 'ai_assistance',
                keywords: this.getMatchedKeywords(lowerMessage, this.promptKeywords)
            };
        }

        // Step 4: Default to chat with role-specific context
        const roleContext = this.getRoleSpecificContext(lowerMessage, userRole);
        
        return {
            type: 'chat',
            priority: this.intentPriority.chat,
            confidence: 0.7,
            subtype: roleContext.subtype,
            keywords: roleContext.keywords,
            roleSpecific: true,
            userRole: userRole
        };
    }

    // ✅ Detect navigation prompts
    detectNavigationPrompt(lowerMessage) {
        const hasNavigationIntent = this.navigationKeywords.some(keyword => 
            lowerMessage.includes(keyword)
        );

        // Exclude database queries that might contain navigation words
        const isDatabaseQuery = Object.values(this.databaseQueryKeywords)
            .flat()
            .some(keyword => lowerMessage.includes(keyword));

        return hasNavigationIntent && !isDatabaseQuery;
    }

    // ✅ Detect database query intents
    detectDatabaseQuery(lowerMessage, userRole) {
        let bestMatch = {
            hasMatch: false,
            confidence: 0,
            category: null,
            keywords: [],
            queryType: null
        };

        // Check each database category
        for (const [category, keywords] of Object.entries(this.databaseQueryKeywords)) {
            const matchedKeywords = keywords.filter(keyword => 
                lowerMessage.includes(keyword)
            );

            if (matchedKeywords.length > 0) {
                const confidence = this.calculateConfidence(matchedKeywords, keywords, userRole, category);
                
                if (confidence > bestMatch.confidence) {
                    bestMatch = {
                        hasMatch: true,
                        confidence: confidence,
                        category: category,
                        keywords: matchedKeywords,
                        queryType: this.determineQueryType(lowerMessage, category)
                    };
                }
            }
        }

        return bestMatch;
    }

    // ✅ Detect direct AI prompt requests
    detectDirectPrompt(lowerMessage) {
        const hasPromptKeywords = this.promptKeywords.some(keyword => 
            lowerMessage.includes(keyword)
        );
        
        // Additional context clues for prompts
        const promptIndicators = [
            'help me', 'giúp tôi', 'hãy', 'please', 'có thể',
            'write', 'create', 'generate', 'make', 'tạo ra'
        ];
        
        const hasPromptIndicators = promptIndicators.some(indicator => 
            lowerMessage.includes(indicator)
        );

        return hasPromptKeywords || hasPromptIndicators;
    }

    // ✅ Calculate confidence score
    calculateConfidence(matchedKeywords, allKeywords, userRole, category) {
        // Base confidence from keyword match ratio
        let confidence = matchedKeywords.length / allKeywords.length;
        
        // Role-specific boost
        const roleSpecific = this.roleSpecificKeywords[userRole] || [];
        const hasRoleMatch = roleSpecific.some(keyword => 
            matchedKeywords.some(matched => matched.includes(keyword))
        );
        
        if (hasRoleMatch) {
            confidence += 0.2;
        }

        // Category-specific adjustments
        const categoryBoosts = {
            rooms: userRole === 'manager' || userRole === 'receptionist' ? 0.1 : 0,
            bookings: userRole === 'receptionist' ? 0.15 : 0,
            reports: userRole === 'manager' ? 0.2 : 0,
            services: userRole === 'customer' ? 0.1 : 0
        };

        confidence += categoryBoosts[category] || 0;

        return Math.min(confidence, 0.95); // Cap at 95%
    }

    // ✅ Determine specific query type
    determineQueryType(lowerMessage, category) {
        const queryTypes = {
            rooms: {
                'trống': 'available_rooms',
                'available': 'available_rooms',
                'status': 'room_status',
                'loại': 'room_types',
                'type': 'room_types',
                'giá': 'room_pricing'
            },
            bookings: {
                'hôm nay': 'today_bookings',
                'today': 'today_bookings',
                'check in': 'checkin_list',
                'check out': 'checkout_list',
                'tạo': 'create_booking',
                'create': 'create_booking'
            },
            pricing: {
                'bảng giá': 'price_list',
                'khuyến mãi': 'promotions',
                'discount': 'promotions',
                'special': 'special_offers'
            },
            services: {
                'dịch vụ': 'service_list',
                'amenity': 'amenities',
                'facility': 'facilities',
                'tiện nghi': 'amenities'
            },
            reports: {
                'doanh thu': 'revenue_report',
                'revenue': 'revenue_report',
                'occupancy': 'occupancy_report',
                'thống kê': 'statistics',
                'performance': 'performance_report'
            }
        };

        const categoryTypes = queryTypes[category] || {};
        
        for (const [keyword, type] of Object.entries(categoryTypes)) {
            if (lowerMessage.includes(keyword)) {
                return type;
            }
        }

        return 'general_query';
    }

    // ✅ Get role-specific context
    getRoleSpecificContext(lowerMessage, userRole) {
        const roleKeywords = this.roleSpecificKeywords[userRole] || [];
        const matchedKeywords = roleKeywords.filter(keyword => 
            lowerMessage.includes(keyword)
        );

        const subtypes = {
            manager: 'management_chat',
            receptionist: 'front_desk_chat', 
            customer: 'customer_service_chat'
        };

        return {
            subtype: subtypes[userRole] || 'general_chat',
            keywords: matchedKeywords,
            hasRoleContext: matchedKeywords.length > 0
        };
    }

    // ✅ Get matched keywords from a list
    getMatchedKeywords(lowerMessage, keywordList) {
        return keywordList.filter(keyword => 
            lowerMessage.includes(keyword)
        );
    }

    // ✅ Get intent-specific quick replies
    getIntentQuickReplies(message, userRole = 'customer', intentData = {}) {
        const lowerMessage = message.toLowerCase();
        
        // Navigation quick replies
        if (intentData.type === 'navigation') {
            return this.getNavigationQuickReplies(userRole);
        }

        // Database query quick replies
        if (intentData.type === 'database_query') {
            return this.getDatabaseQuickReplies(intentData.subtype, userRole);
        }

        // Prompt quick replies
        if (intentData.type === 'prompt') {
            return this.getPromptQuickReplies();
        }

        // Content-based quick replies
        if (lowerMessage.includes('phòng') || lowerMessage.includes('room')) {
            return ['🏨 Phòng trống', '🔄 Cập nhật status', '🧹 Housekeeping', '🔧 Maintenance'];
        } 
        
        if (lowerMessage.includes('booking') || lowerMessage.includes('đặt phòng')) {
            return ['📋 Booking hôm nay', '✅ Check-in', '🚪 Check-out', '📝 Modify'];
        }
        
        if (lowerMessage.includes('khách') || lowerMessage.includes('customer')) {
            return ['👥 Guest info', '📞 VIP requests', '🛎️ Room service', '💬 Feedback'];
        }
        
        if (lowerMessage.includes('thanh toán') || lowerMessage.includes('payment')) {
            return ['💳 Process payment', '🧾 Print receipt', '💰 Reconcile', '📊 Analytics'];
        }
        
        if (lowerMessage.includes('báo cáo') || lowerMessage.includes('report')) {
            return ['📊 Daily report', '📈 Occupancy', '💰 Revenue', '👥 Satisfaction'];
        }
        
        if (lowerMessage.includes('thời tiết') || lowerMessage.includes('weather')) {
            return ['🌤️ Hà Nội hôm nay', '📅 Dự báo tuần', '🧳 Khuyến nghị', '🌧️ Alerts'];
        }

        // Default role-based quick replies
        return this.getDefaultQuickReplies(userRole);
    }

    // ✅ Navigation quick replies
    getNavigationQuickReplies(userRole) {
        const roleNavigation = {
            manager: ['📊 Dashboard', '🛏️ Quản lý phòng', '👥 Nhân sự', '📈 Báo cáo'],
            receptionist: ['🛎️ Front desk', '📋 Bookings', '🔑 Check-in', '🚪 Check-out'],
            customer: ['🏠 Trang chủ', '🛏️ Đặt phòng', '📞 Liên hệ', '🗺️ Tham quan']
        };

        return roleNavigation[userRole] || ['🏠 Trang chủ', '👤 Hồ sơ', '📞 Liên hệ', '🧭 Điều hướng'];
    }

    // ✅ Database query quick replies
    getDatabaseQuickReplies(category, userRole) {
        const dbQuickReplies = {
            rooms: ['🏨 Phòng trống', '📊 Thống kê phòng', '🔄 Cập nhật status', '🛏️ Loại phòng'],
            bookings: ['📋 Hôm nay', '✅ Check-in list', '🚪 Check-out list', '📅 Upcoming'],
            pricing: ['💰 Bảng giá', '🎁 Khuyến mãi', '📊 So sánh', '💳 Thanh toán'],
            services: ['🛎️ Room service', '🏊 Pool & Spa', '🍽️ Restaurant', '🚗 Transportation'],
            reports: ['📈 Revenue', '📊 Occupancy', '👥 Guest satisfaction', '💰 Profit margin']
        };

        return dbQuickReplies[category] || this.getDefaultQuickReplies(userRole);
    }

    // ✅ Prompt quick replies
    getPromptQuickReplies() {
        return [
            '✍️ Viết email', 
            '📝 Tạo mô tả', 
            '🗺️ Lập kế hoạch', 
            '🌤️ Thời tiết'
        ];
    }

    // ✅ Default quick replies by role
    getDefaultQuickReplies(userRole) {
        const defaultReplies = {
            manager: ['📊 Dashboard', '🛏️ Phòng', '📈 Báo cáo', '👥 Nhân sự'],
            receptionist: ['🛎️ Front desk', '📋 Booking', '🔑 Check-in', '💬 Support'],
            customer: ['🛏️ Đặt phòng', '🌤️ Thời tiết', '🗺️ Tham quan', '📞 Liên hệ']
        };

        return defaultReplies[userRole] || ['🛏️ Đặt phòng', '🌤️ Thời tiết', '🗺️ Tham quan', '📞 Liên hệ'];
    }

    // ✅ Get intent analysis summary
    getIntentAnalysis(message, userRole = 'customer') {
        const intent = this.classifyIntent(message, userRole);
        
        return {
            originalMessage: message.substring(0, 100),
            userRole: userRole,
            detectedIntent: intent,
            processingTime: new Date().toISOString(),
            confidence: intent.confidence,
            recommendedAction: this.getRecommendedAction(intent),
            quickReplies: this.getIntentQuickReplies(message, userRole, intent)
        };
    }

    // ✅ Get recommended action based on intent
    getRecommendedAction(intent) {
        const actions = {
            navigation: 'Execute navigation to requested page',
            database_query: `Query ${intent.subtype} from database`,
            prompt: 'Process with AI language model',
            chat: `Handle as ${intent.subtype} conversation`
        };

        return actions[intent.type] || 'Process as general chat';
    }

    // ✅ Validate intent classification
    validateIntent(intent) {
        const requiredFields = ['type', 'priority', 'confidence'];
        const isValid = requiredFields.every(field => 
            intent.hasOwnProperty(field) && intent[field] !== undefined
        );

        return {
            isValid,
            intent,
            errors: isValid ? [] : [`Missing required fields: ${requiredFields.filter(f => !intent[f]).join(', ')}`]
        };
    }
}

export default IntentClassifier;