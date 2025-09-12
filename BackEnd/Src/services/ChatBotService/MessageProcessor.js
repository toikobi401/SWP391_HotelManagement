class MessageProcessor {
    constructor(contextManager, intentClassifier, responseGenerator, actionHandler) {
        this.contextManager = contextManager;
        this.intentClassifier = intentClassifier;
        this.responseGenerator = responseGenerator;
        this.actionHandler = actionHandler;
    }

    // Main message processing pipeline
    async processMessage(message, conversationHistory = [], userContext = {}) {
        try {
            console.log('🔄 Processing message:', {
                message: message.substring(0, 50) + '...',
                userRole: userContext.userRole,
                userId: userContext.userId
            });

            // Step 1: Classify intent
            const intent = this.intentClassifier.classifyIntent(message);
            console.log('🎯 Intent classified:', intent);

            // Step 2: Process based on intent priority
            switch (intent.type) {
                case 'navigation':
                    return await this.processNavigationIntent(message, userContext);
                    
                case 'prompt':
                    return await this.processPromptIntent(message, conversationHistory);
                    
                case 'chat':
                default:
                    return await this.processChatIntent(message, conversationHistory, userContext);
            }

        } catch (error) {
            console.error('❌ Error in message processing pipeline:', error);
            return {
                text: 'Xin lỗi, tôi không thể xử lý tin nhắn này lúc này. Vui lòng thử lại sau.',
                isNavigationResponse: false,
                error: error.message
            };
        }
    }

    // Process navigation intent
    async processNavigationIntent(message, userContext) {
        console.log('🧭 Processing navigation intent');
        
        const navigationResult = await this.actionHandler.handleNavigationPrompt(
            message, 
            userContext.userRole, 
            userContext.userRoles || []
        );
        
        console.log('📍 Navigation result:', navigationResult);

        return {
            text: navigationResult.message,
            isNavigationResponse: true,
            navigation: {
                action: navigationResult.action,
                actionData: navigationResult.actionData
            },
            quickReplies: this.getNavigationQuickReplies()
        };
    }

    // Process prompt intent
    async processPromptIntent(message, conversationHistory) {
        console.log('🎯 Processing prompt intent');
        
        const promptResult = await this.responseGenerator.handleDirectPrompt(message, conversationHistory);
        
        return {
            text: promptResult.response,
            isNavigationResponse: false,
            metadata: {
                type: 'prompt',
                model: promptResult.model,
                promptType: promptResult.promptType
            },
            quickReplies: this.responseGenerator.getQuickReplies('direct_prompt')
        };
    }

    // Process regular chat intent
    async processChatIntent(message, conversationHistory, userContext) {
        console.log('💬 Processing chat intent');
        
        const chatResult = await this.responseGenerator.generateChatResponse(message, conversationHistory);
        
        // Get intent-specific quick replies
        const quickReplies = this.intentClassifier.getIntentQuickReplies(message);
        
        return {
            text: chatResult.text,
            isNavigationResponse: false,
            metadata: {
                type: chatResult.type,
                model: chatResult.model,
                databaseIntegrated: chatResult.databaseIntegrated
            },
            quickReplies: quickReplies
        };
    }

    // Get navigation-specific quick replies
    getNavigationQuickReplies() {
        return [
            '🏠 Trang chủ',
            '👤 Hồ sơ của tôi', 
            '📞 Liên hệ hỗ trợ',
            '🧭 Xem tất cả trang'
        ];
    }

    // Validate message input
    validateMessage(message) {
        if (!message || typeof message !== 'string') {
            return {
                valid: false,
                error: 'Message must be a non-empty string'
            };
        }

        if (message.trim().length === 0) {
            return {
                valid: false,
                error: 'Message cannot be empty'
            };
        }

        if (message.length > 2000) {
            return {
                valid: false,
                error: 'Message too long (max 2000 characters)'
            };
        }

        return { valid: true };
    }

    // Get processing statistics
    getProcessingStats() {
        return {
            modules: {
                contextManager: !!this.contextManager,
                intentClassifier: !!this.intentClassifier,
                responseGenerator: !!this.responseGenerator,
                actionHandler: !!this.actionHandler
            },
            capabilities: [
                'Intent classification',
                'Navigation handling',
                'Prompt processing',
                'Database integration',
                'Multi-turn conversation'
            ]
        };
    }
}

export default MessageProcessor;