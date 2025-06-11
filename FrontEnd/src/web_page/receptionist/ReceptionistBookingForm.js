import React from 'react';
import BookingForm from '../booking/BookingForm';

const ReceptionistBookingForm = () => {
    return (
        <div className="receptionist-booking-wrapper">
            <div className="container">
                <div className="row">
                    <div className="col-12">
                        <div className="mb-4 text-center">
                            <div className="alert alert-info">
                                <h5><i className="fas fa-info-circle"></i> Hướng dẫn đặt phòng cho lễ tân</h5>
                                <p className="mb-0">
                                    Vui lòng điền đầy đủ thông tin khách hàng và kiểm tra tình trạng phòng trước khi xác nhận đặt phòng.
                                </p>
                            </div>
                        </div>
                        <BookingForm />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceptionistBookingForm;