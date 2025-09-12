import express from 'express';
import ChatBotService from '../services/ChatBotService/index.js'; // ✅ UPDATED IMPORT

const router = express.Router();

// ✅ INITIALIZE MODULAR CHATBOT SERVICE
let chatbotService = null;

try {
    chatbotService = new ChatBotService();
    console.log('✅ Modular ChatBotService initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize modular ChatBotService:', error);
}

// ✅ Main chat endpoint - UPDATED TO USE MODULAR SERVICE
router.post('/chat', async (req, res) => {
    try {
        if (!chatbotService) {
            return res.status(503).json({
                success: false,
                error: 'ChatBot service is not available',
                message: 'Dịch vụ ChatBot tạm thời không khả dụng'
            });
        }

        const { 
            message, 
            userRole, 
            userId, 
            userName, 
            userRoles, 
            sessionId, 
            context,
            conversationHistory = []
        } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message is required',
                message: 'Tin nhắn không được để trống'
            });
        }

        console.log('💬 Chat request:', {
            message: message.substring(0, 50) + '...',
            userRole,
            userId,
            sessionId: sessionId?.substring(0, 20) + '...'
        });

        // ✅ PREPARE USER CONTEXT FOR MODULAR SERVICE
        const userContext = {
            userRole: userRole || 'customer',
            userId: userId || null,
            userName: userName || 'Guest',
            userRoles: Array.isArray(userRoles) ? userRoles : [],
            sessionId: sessionId || `session_${Date.now()}`,
            context: context || {}
        };

        // ✅ PROCESS MESSAGE WITH MODULAR SERVICE
        const result = await chatbotService.generateResponse(
            message.trim(),
            conversationHistory,
            userContext
        );

        console.log('✅ Modular response generated:', {
            hasText: !!result.text,
            isNavigation: !!result.isNavigationResponse,
            hasQuickReplies: !!result.quickReplies
        });

        // ✅ ENHANCED RESPONSE FORMAT
        const response = {
            success: true,
            response: result.text,
            model: 'Modular ChatBot Service',
            timestamp: new Date().toISOString(),
            isNavigationResponse: result.isNavigationResponse || false,
            quickReplies: result.quickReplies || [],
            metadata: result.metadata || {},
            userContext: {
                role: userContext.userRole,
                hasNavigation: !!result.navigation
            }
        };

        // ✅ ADD NAVIGATION DATA IF PRESENT
        if (result.navigation) {
            response.navigation = result.navigation;
        }

        res.json(response);

    } catch (error) {
        console.error('❌ Chat endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Lỗi hệ thống, vui lòng thử lại sau',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ✅ Health check for modular service
router.get('/health', (req, res) => {
    try {
        const isHealthy = !!chatbotService;
        const stats = isHealthy ? chatbotService.messageProcessor?.getProcessingStats() : null;
        
        res.json({
            success: true,
            status: isHealthy ? 'healthy' : 'unhealthy',
            service: 'Modular ChatBot Service',
            timestamp: new Date().toISOString(),
            modules: stats?.modules || {},
            capabilities: stats?.capabilities || []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'error',
            error: error.message
        });
    }
});

// ✅ Model info endpoint
router.get('/model-info', (req, res) => {
    try {
        if (!chatbotService) {
            return res.status(503).json({
                success: false,
                error: 'ChatBot service not available'
            });
        }

        const modelInfo = chatbotService.getModelInfo();
        
        res.json({
            success: true,
            data: {
                ...modelInfo,
                architecture: 'Modular Service',
                modules: [
                    'IntentClassifier',
                    'ResponseGenerator', 
                    'ContextManager',
                    'ActionHandler',
                    'MessageProcessor'
                ]
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ Cache management endpoints
router.post('/refresh-cache', async (req, res) => {
    try {
        if (!chatbotService) {
            return res.status(503).json({
                success: false,
                error: 'ChatBot service not available'
            });
        }

        const result = await chatbotService.refreshCache();
        
        res.json({
            success: true,
            message: 'Cache refreshed successfully',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/cache-status', (req, res) => {
    try {
        if (!chatbotService) {
            return res.status(503).json({
                success: false,
                error: 'ChatBot service not available'
            });
        }

        const status = chatbotService.getCacheStatus();
        
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;