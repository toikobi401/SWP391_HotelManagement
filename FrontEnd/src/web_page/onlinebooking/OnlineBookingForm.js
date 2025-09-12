import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './OnlineBookingForm.css';
import DateTimeSectionOnline from './component/DateTimeSectionOnline';
import RoomTypeSelectionOnline from './component/RoomTypeSelectionOnline';
import ServicesSectionOnline from './component/ServicesSectionOnline';
import SpecialRequestOnline from './component/SpecialRequestOnline';
import PromotionOnline from './component/PromotionOnline';
import PricingSummaryOnline from './component/PricingSummaryOnline';
import { useServicesOnline } from './hooks/useServicesOnline';
import { usePricingOnline } from './hooks/usePricingOnline';
import { useRoomTypesOnline } from './hooks/useRoomTypesOnline'; // ✅ THÊM

// ✅ SỬA: Giảm fallback services vì sẽ dùng database chính
const fallbackServices = [
  { id: 1, name: 'Spa & Massage', price: 500000 },
  { id: 2, name: 'Ăn sáng buffet', price: 200000 },
  { id: 3, name: 'Đưa đón sân bay', price: 300000 },
  { id: 4, name: 'Thuê xe máy', price: 150000 },
  { id: 5, name: 'Tour du lịch', price: 800000 },
  { id: 6, name: 'Giặt ủi', price: 100000 },
  { id: 7, name: 'Phòng gym', price: 100000 },
  { id: 8, name: 'Karaoke', price: 250000 }
];

const OnlineBookingForm = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  const [form, setForm] = useState({
    checkIn: '',
    checkOut: '',
    numberOfGuest: 1,
    specialRequest: ''  // ✅ THÊM
  });

  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]); 
  const [selectedPromotion, setSelectedPromotion] = useState(null);

  // ✅ THÊM: Sử dụng useRoomTypesOnline để lấy room types từ database
  const { roomTypes, roomTypesLoading, roomTypesError } = useRoomTypesOnline();

  // ✅ THÊM: Sử dụng useServicesOnline để lấy services từ database
  const { availableServices, servicesLoading, servicesError } = useServicesOnline();

  // ✅ SỬA: Sử dụng usePricingOnline với roomTypes
  const { pricingBreakdown, getServicePriceFromDB } = usePricingOnline(
    form,
    selectedRooms,
    selectedServices,
    availableServices,
    selectedPromotion,
    roomTypes // ✅ THÊM roomTypes
  );

  const customerInfo = {
    customerName: user?.Fullname || '',
    phoneNumber: user?.PhoneNumber || '',
    email: user?.Email || '',
    userID: user?.UserID || null
  };

  useEffect(() => {
    if (location.state?.bookingData) {
      const { checkIn, checkOut, numberOfGuest } = location.state.bookingData;
      console.log('🔍 OnlineBookingForm - Received data from homepage:', location.state.bookingData);
      console.log('🔍 OnlineBookingForm - numberOfGuest from homepage:', numberOfGuest);
      
      setForm(prev => ({
        ...prev,
        checkIn: checkIn || '',
        checkOut: checkOut || '',
        numberOfGuest: numberOfGuest || 1
      }));
      
      console.log('✅ Updated form state with homepage data');
    }
  }, [location.state]);

  // ✅ SỬA: useEffect để set default dates nếu chưa có
  useEffect(() => {
    if (!form.checkIn || !form.checkOut) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      now.setHours(12, 0, 0, 0); // 12:00 PM
      tomorrow.setHours(11, 30, 0, 0); // 11:30 AM
      
      setForm(prev => ({
        ...prev,
        checkIn: prev.checkIn || now.toISOString().slice(0, 16),
        checkOut: prev.checkOut || tomorrow.toISOString().slice(0, 16)
      }));
    }
  }, []);

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'numberOfGuest' ? parseInt(value) || 1 : value
    }));
  };

  // ✅ SỬA: Sử dụng getServicePriceFromDB thay vì hardcode
  const getServicePrice = (serviceId) => {
    // ✅ Ưu tiên lấy từ database
    const priceFromDB = getServicePriceFromDB(serviceId);
    if (priceFromDB > 0) {
      console.log(`💰 Service ID ${serviceId} price from DB: ${priceFromDB.toLocaleString()}đ`);
      return priceFromDB;
    }
    
    // ✅ Fallback nếu không tìm thấy trong DB
    const fallbackService = fallbackServices.find(service => service.id === serviceId);
    if (fallbackService) {
      console.log(`💰 Service ID ${serviceId} price from fallback: ${fallbackService.price.toLocaleString()}đ`);
      return fallbackService.price;
    }
    
    console.warn(`⚠️ Service ID ${serviceId} not found in DB or fallback`);
    return 0;
  };

  // ✅ SỬA: Sử dụng pricingBreakdown thay vì tính toán thủ công
  const totalAmount = pricingBreakdown.originalTotal || 0;
  
  const promotionCalculation = {
    originalAmount: totalAmount,
    discountAmount: pricingBreakdown.promotionDiscount || 0,
    finalAmount: pricingBreakdown.finalTotal || totalAmount
  };

  // ✅ Debug log để kiểm tra data flow
  useEffect(() => {
    console.log('📊 Online booking form data updated:', {
      form,
      selectedRooms: selectedRooms.length,
      selectedServices: selectedServices.length,
      roomTypes: roomTypes.length, // ✅ THÊM
      roomTypesLoading, // ✅ THÊM
      availableServices: availableServices.length,
      servicesLoading,
      pricingBreakdown,
      customerInfo,
      totalAmount,
      promotionCalculation,
      step
    });
  }, [form, selectedRooms, selectedServices, roomTypes, roomTypesLoading, availableServices, servicesLoading, pricingBreakdown, step, customerInfo, totalAmount, promotionCalculation]);

  return (
    <div className="booking-bg-fullscreen">
      <div className="online-booking-form">
        {step === 1 && (
          <DateTimeSectionOnline
            formData={form}
            handleInputChange={handleFormChange}
            nextStep={() => setStep(2)}
            hasPrefilledData={!!location.state?.bookingData}
          />
        )}
        {step === 2 && (
          <RoomTypeSelectionOnline
            formData={form}
            selectedRooms={selectedRooms}
            setSelectedRooms={setSelectedRooms}
            nextStep={() => setStep(3)}
            prevStep={() => setStep(1)}
            roomTypes={roomTypes} // ✅ THÊM: Truyền roomTypes
            roomTypesLoading={roomTypesLoading} // ✅ THÊM
            roomTypesError={roomTypesError} // ✅ THÊM
          />
        )}
        {step === 3 && (
          <ServicesSectionOnline
            selectedServices={selectedServices}
            setSelectedServices={setSelectedServices}
            nextStep={() => setStep(4)}
            prevStep={() => setStep(2)}
            availableServices={availableServices} // ✅ THÊM: Truyền services từ DB
            servicesLoading={servicesLoading}
            servicesError={servicesError}
          />
        )}
        {step === 4 && (
          <SpecialRequestOnline
            formData={form}
            handleInputChange={handleFormChange}
            nextStep={() => setStep(5)}
            prevStep={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <PromotionOnline
            selectedPromotion={selectedPromotion}
            setSelectedPromotion={setSelectedPromotion}
            totalAmount={totalAmount}
            nextStep={() => setStep(6)}
            prevStep={() => setStep(4)}
          />
        )}
        {step === 6 && (
          <PricingSummaryOnline
            formData={{
              ...customerInfo,
              checkIn: form.checkIn,
              checkOut: form.checkOut,
              numberOfGuest: form.numberOfGuest,
              specialRequest: form.specialRequest || null
            }}
            selectedRooms={selectedRooms}
            selectedServices={selectedServices}
            selectedPromotion={selectedPromotion}
            availableServices={availableServices}
            availableRoomTypes={roomTypes} // ✅ THÊM: Truyền roomTypes từ hook
            pricingBreakdown={pricingBreakdown}
            totalAmount={totalAmount}
            promotionCalculation={promotionCalculation}
            prevStep={() => setStep(5)}
            goToInvoice={() => setStep(7)}
          />
        )}
        {step === 7 && (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            padding: '40px', 
            borderRadius: '12px', 
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <h2>Thanh toán hóa đơn</h2>
            <p>Đây là trang hóa đơn/thanh toán (Invoice).</p>
            <div style={{ marginTop: '20px', textAlign: 'left' }}>
              <h4>Thông tin khách hàng:</h4>
              <p><strong>Họ tên:</strong> {customerInfo.customerName}</p>
              <p><strong>Email:</strong> {customerInfo.email}</p>
              <p><strong>Số điện thoại:</strong> {customerInfo.phoneNumber}</p>
              {selectedPromotion && (
                <div style={{ marginTop: '20px' }}>
                  <h4>Chi tiết thanh toán:</h4>
                  <p><strong>Tổng tiền gốc:</strong> {promotionCalculation.originalAmount.toLocaleString('vi-VN')}đ</p>
                  <p><strong>Giảm giá:</strong> -{promotionCalculation.discountAmount.toLocaleString('vi-VN')}đ ({selectedPromotion.discountPercent}%)</p>
                  <p><strong>Thành tiền:</strong> {promotionCalculation.finalAmount.toLocaleString('vi-VN')}đ</p>
                </div>
              )}
              {/* ✅ THÊM: Hiển thị breakdown chi tiết */}
              <div style={{ marginTop: '20px' }}>
                <h4>Chi tiết pricing:</h4>
                <p><strong>Phòng:</strong> {pricingBreakdown.roomSubtotal.toLocaleString('vi-VN')}đ</p>
                <p><strong>Dịch vụ:</strong> {pricingBreakdown.servicesSubtotal.toLocaleString('vi-VN')}đ</p>
                {pricingBreakdown.lateCheckoutFee > 0 && (
                  <p><strong>Phí checkout muộn:</strong> {pricingBreakdown.lateCheckoutFee.toLocaleString('vi-VN')}đ</p>
                )}
                <p><strong>Số đêm:</strong> {pricingBreakdown.nightCount} đêm</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineBookingForm;