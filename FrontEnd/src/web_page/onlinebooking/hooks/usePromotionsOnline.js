import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export const usePromotionsOnline = () => {
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
      
      console.log('🎯 Fetching active promotions for online booking...');
      
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
          console.log(`✅ Loaded ${data.data.length} active promotions for online booking`);
          setPromotions(data.data);
        } else {
          console.warn('⚠️ No active promotions found for online booking');
          setFallbackPromotions();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tải khuyến mãi');
      }
    } catch (error) {
      console.error('❌ Error fetching promotions for online booking:', error);
      setPromotionsError(error.message);
      setFallbackPromotions();
    } finally {
      setPromotionsLoading(false);
    }
  };

  // Set fallback promotions data
  const setFallbackPromotions = () => {
    const fallbackPromotions = [
      {
        promotionID: 1,
        promotionName: 'Giảm giá mùa hè',
        discountPercent: 10,
        description: 'Giảm 10% cho tất cả dịch vụ trong mùa hè',
        startDate: '2025-06-01',
        endDate: '2025-08-31',
        status: 'Active'
      },
      {
        promotionID: 2,
        promotionName: 'Khách hàng mới',
        discountPercent: 15,
        description: 'Ưu đãi đặc biệt cho khách hàng đặt phòng lần đầu',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'Active'
      },
      {
        promotionID: 3,
        promotionName: 'Cuối tuần vui vẻ',
        discountPercent: 20,
        description: 'Giảm 20% cho đặt phòng cuối tuần',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'Active'
      },
      {
        promotionID: 4,
        promotionName: 'Ở lâu giảm nhiều',
        discountPercent: 25,
        description: 'Giảm 25% cho đặt phòng từ 5 đêm trở lên',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'Active'
      }
    ];
    setPromotions(fallbackPromotions);
    console.log('✅ Set fallback promotions for online booking');
  };

  // Apply promotion
  const applyPromotion = (promotion) => {
    if (!promotion) {
      toast.error('Khuyến mãi không hợp lệ');
      return false;
    }

    // ✅ SỬA: Validate promotion data
    const discountPercent = parseFloat(promotion.discountPercent);
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      toast.error('Phần trăm giảm giá không hợp lệ');
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
    
    console.log('✅ Applied promotion for online booking:', {
      name: promotion.promotionName,
      discount: discountPercent + '%',
      promotionData: promotion
    });
    
    toast.success(`Áp dụng khuyến mãi "${promotion.promotionName}" thành công! Giảm ${discountPercent}%`);
    
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

  // ✅ SỬA: Calculate discount amount với validation chặt chẽ
  const calculateDiscount = (totalAmount) => {
    console.log('🧮 calculateDiscount called with:', {
      totalAmount,
      totalAmountType: typeof totalAmount,
      appliedPromotion,
      hasPromotion: !!appliedPromotion
    });

    // Validation inputs
    if (!appliedPromotion) {
      console.log('❌ No promotion applied');
      return 0;
    }
    
    const validTotalAmount = parseFloat(totalAmount);
    if (!validTotalAmount || isNaN(validTotalAmount) || validTotalAmount <= 0) {
      console.log('❌ Invalid total amount:', { totalAmount, validTotalAmount, isNaN: isNaN(validTotalAmount) });
      return 0;
    }

    const discountPercent = parseFloat(appliedPromotion.discountPercent);
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      console.log('❌ Invalid discount percent:', { discountPercent, appliedPromotion });
      return 0;
    }
    
    const discountAmount = Math.round((validTotalAmount * discountPercent) / 100);
    
    console.log('✅ Discount calculation:', {
      totalAmount: validTotalAmount,
      discountPercent: discountPercent + '%',
      discountAmount,
      calculation: `${validTotalAmount} × ${discountPercent}% = ${discountAmount}`
    });
    
    return discountAmount;
  };

  // ✅ SỬA: Calculate final amount với validation
  const calculateFinalAmount = (totalAmount) => {
    const validTotalAmount = parseFloat(totalAmount);
    if (!validTotalAmount || isNaN(validTotalAmount) || validTotalAmount <= 0) {
      console.log('❌ Invalid total amount for final calculation:', totalAmount);
      return 0;
    }

    const discountAmount = calculateDiscount(validTotalAmount);
    const finalAmount = Math.max(0, validTotalAmount - discountAmount);
    
    console.log('💰 Final amount calculation:', {
      originalAmount: validTotalAmount,
      discountAmount,
      finalAmount
    });
    
    return finalAmount;
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