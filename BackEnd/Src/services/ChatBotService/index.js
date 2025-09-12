import IntentClassifier from './IntentClassifier.js';
import ResponseGenerator from './ResponseGenerator.js';
import ContextManager from './ContextManager.js';
import ActionHandler from './ActionHandler.js';
import MessageProcessor from './MessageProcessor.js';

class ChatBotService {
    constructor() {
        // Initialize all modules
        this.contextManager = new ContextManager();
        this.intentClassifier = new IntentClassifier();
        this.responseGenerator = new ResponseGenerator(this.contextManager);
        this.actionHandler = new ActionHandler();
        this.messageProcessor = new MessageProcessor(
            this.contextManager,
            this.intentClassifier,
            this.responseGenerator,
            this.actionHandler
        );

        console.log('✅ ChatBotService initialized with modular architecture');
    }

    // Main entry point
    async generateResponse(message, conversationHistory = [], userContext = {}) {
        try {
            return await this.messageProcessor.processMessage(message, conversationHistory, userContext);
        } catch (error) {
            console.error('❌ Error in ChatBotService.generateResponse:', error);
            return {
                text: 'Xin lỗi, tôi không thể xử lý tin nhắn này lúc này. Vui lòng thử lại sau.',
                isNavigationResponse: false,
                error: error.message
            };
        }
    }

    // Direct prompt handling
    async handleDirectPrompt(prompt, conversationHistory = []) {
        return await this.responseGenerator.handleDirectPrompt(prompt, conversationHistory);
    }

    // Navigation handling
    async handleNavigationPrompt(message, userRole, userRoles = []) {
        return await this.actionHandler.handleNavigationPrompt(message, userRole, userRoles);
    }

    // Quick replies
    getQuickReplies(intent) {
        return this.responseGenerator.getQuickReplies(intent);
    }

    // Model info
    getModelInfo() {
        return this.responseGenerator.getModelInfo();
    }

    // Cache management
    async refreshCache() {
        return await this.contextManager.refreshCache();
    }

    getCacheStatus() {
        return this.contextManager.getCacheStatus();
    }

    // Available routes
    getAvailableRoutes(userRoles = []) {
        return this.actionHandler.getAvailableRoutes(userRoles);
    }
}

export default ChatBotService;