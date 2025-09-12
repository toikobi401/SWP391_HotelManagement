import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export const usePromotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);
  const [promotionsError, setPromotionsError] = useState(null);
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [promotionCode, setPromotionCode] = useState('');

  // Fetch active promotions from API
  const fetchActivePromotions = async () => {
    try {
      setPromotionsLoading(true);
      setPromotionsError(null);
      
      console.log('🎯 Fetching active promotions...');
      
      const response = await fetch('http://localhost:3000/api/promotions/active', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          console.log(`✅ Loaded ${data.data.length} active promotions`);
          setPromotions(data.data);
        } else {
          console.warn('⚠️ No active promotions found');
          setPromotions([]);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tải khuyến mãi');
      }
    } catch (error) {
      console.error('❌ Error fetching promotions:', error);
      setPromotionsError(error.message);
      setPromotions([]);
    } finally {
      setPromotionsLoading(false);
    }
  };

  // Search promotion by name/code
  const searchPromotion = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    try {
      console.log(`🔍 Searching promotions with term: "${searchTerm}"`);
      
      const response = await fetch(`http://localhost:3000/api/promotions/search/${encodeURIComponent(searchTerm.trim())}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // Filter only active promotions
          const activePromotions = data.data.filter(promotion => {
            const now = new Date();
            const startDate = new Date(promotion.startDate);
            const endDate = new Date(promotion.endDate);
            return now >= startDate && now <= endDate;
          });
          
          console.log(`✅ Found ${activePromotions.length} active promotions matching "${searchTerm}"`);
          return activePromotions;
        }
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error searching promotions:', error);
      return [];
    }
  };

  // Apply promotion
  const applyPromotion = (promotion) => {
    if (!promotion) {
      toast.error('Khuyến mãi không hợp lệ');
      return false;
    }

    // Check if promotion is active
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    
    if (now < startDate) {
      toast.error('Khuyến mãi chưa có hiệu lực');
      return false;
    }
    
    if (now > endDate) {
      toast.error('Khuyến mãi đã hết hạn');
      return false;
    }

    setAppliedPromotion(promotion);
    setPromotionCode(promotion.promotionName);
    
    console.log('✅ Applied promotion:', promotion.promotionName, `${promotion.discountPercent}%`);
    toast.success(`Áp dụng khuyến mãi "${promotion.promotionName}" thành công! Giảm ${promotion.discountPercent}%`);
    
    return true;
  };

  // Remove applied promotion
  const removePromotion = () => {
    const removedPromotion = appliedPromotion;
    setAppliedPromotion(null);
    setPromotionCode('');
    
    if (removedPromotion) {
      console.log('🗑️ Removed promotion:', removedPromotion.promotionName);
      toast.info(`Đã bỏ khuyến mãi "${removedPromotion.promotionName}"`);
    }
  };

  // Calculate discount amount
  const calculateDiscount = (totalAmount) => {
    if (!appliedPromotion || !totalAmount || totalAmount <= 0) {
      return 0;
    }
    
    const discountAmount = (totalAmount * appliedPromotion.discountPercent) / 100;
    return Math.round(discountAmount);
  };

  // Calculate final amount after discount
  const calculateFinalAmount = (totalAmount) => {
    const discountAmount = calculateDiscount(totalAmount);
    return Math.max(0, totalAmount - discountAmount);
  };

  // Find promotion by name (for manual input)
  const findPromotionByName = async (promotionName) => {
    if (!promotionName || promotionName.trim().length === 0) {
      return null;
    }

    try {
      const searchResults = await searchPromotion(promotionName);
      
      // Find exact match first
      const exactMatch = searchResults.find(p => 
        p.promotionName.toLowerCase() === promotionName.toLowerCase()
      );
      
      if (exactMatch) {
        return exactMatch;
      }
      
      // If no exact match, return first partial match
      return searchResults.length > 0 ? searchResults[0] : null;
      
    } catch (error) {
      console.error('❌ Error finding promotion:', error);
      return null;
    }
  };

  // Validate promotion code
  const validatePromotionCode = async (code) => {
    if (!code || code.trim().length === 0) {
      return { isValid: false, message: 'Vui lòng nhập mã khuyến mãi' };
    }

    const promotion = await findPromotionByName(code.trim());
    
    if (!promotion) {
      return { isValid: false, message: 'Mã khuyến mãi không tồn tại' };
    }

    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    
    if (now < startDate) {
      return { 
        isValid: false, 
        message: `Khuyến mãi sẽ có hiệu lực từ ${startDate.toLocaleDateString('vi-VN')}` 
      };
    }
    
    if (now > endDate) {
      return { 
        isValid: false, 
        message: `Khuyến mãi đã hết hạn vào ${endDate.toLocaleDateString('vi-VN')}` 
      };
    }

    return { 
      isValid: true, 
      promotion, 
      message: `Khuyến mãi hợp lệ - Giảm ${promotion.discountPercent}%` 
    };
  };

  // Load promotions on mount
  useEffect(() => {
    fetchActivePromotions();
  }, []);

  return {
    // State
    promotions,
    promotionsLoading,
    promotionsError,
    appliedPromotion,
    promotionCode,
    setPromotionCode,
    
    // Actions
    fetchActivePromotions,
    searchPromotion,
    applyPromotion,
    removePromotion,
    findPromotionByName,
    validatePromotionCode,
    
    // Calculations
    calculateDiscount,
    calculateFinalAmount,
    
    // Computed values
    hasDiscount: !!appliedPromotion,
    discountPercent: appliedPromotion?.discountPercent || 0
  };
};