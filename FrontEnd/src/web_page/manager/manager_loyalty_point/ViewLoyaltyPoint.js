import React, { useState, useEffect } from "react";
import "./ViewLoyaltyPoint.css";

const serviceListInit = [
  // Spa & Wellness
  { group: "Spa & Wellness", name: "Thai Traditional Massage", points: 150 },
  { group: "Spa & Wellness", name: "Hot Stone Therapy", points: 200 },
  { group: "Spa & Wellness", name: "Aromatherapy Spa", points: 150 },
  { group: "Spa & Wellness", name: "Couple Spa Package", points: 200 },
  { group: "Spa & Wellness", name: "Facial Treatment", points: 100 },
  { group: "Spa & Wellness", name: "Body Scrub & Wrap", points: 100 },
  { group: "Spa & Wellness", name: "Massage chân thư giãn", points: 50 },
  // Ăn uống
  { group: "Ăn uống", name: "Breakfast Buffet Premium", points: 50 },
  { group: "Ăn uống", name: "Romantic Dinner by the Beach", points: 300 },
  { group: "Ăn uống", name: "BBQ Seafood Party", points: 200 },
  { group: "Ăn uống", name: "Room Service 24/7", points: 30 },
  { group: "Ăn uống", name: "Wine Tasting Experience", points: 100 },
  { group: "Ăn uống", name: "Chef Table Experience", points: 300 },
  { group: "Ăn uống", name: "Ăn sáng phở Việt Nam", points: 20 },
  // Vận chuyển
  { group: "Vận chuyển", name: "Airport Transfer VIP", points: 100 },
  { group: "Vận chuyển", name: "City Tour by Limousine", points: 200 },
  { group: "Vận chuyển", name: "Motorbike Rental", points: 50 },
  { group: "Vận chuyển", name: "Bicycle Rental", points: 30 },
  { group: "Vận chuyển", name: "Private Car with Driver", points: 150 },
  { group: "Vận chuyển", name: "Helicopter Transfer", points: 500 },
  // Tour & Hoạt động
  { group: "Tour & Hoạt động", name: "Island Hopping Adventure", points: 200 },
  { group: "Tour & Hoạt động", name: "Sunrise Hot Air Balloon", points: 400 },
  { group: "Tour & Hoạt động", name: "Scuba Diving Beginner", points: 200 },
  { group: "Tour & Hoạt động", name: "Sunset Sailing Trip", points: 150 },
  { group: "Tour & Hoạt động", name: "Cooking Class Vietnamese", points: 100 },
  { group: "Tour & Hoạt động", name: "Jungle Trekking Tour", points: 150 },
  { group: "Tour & Hoạt động", name: "Tour Sài Gòn về đêm", points: 100 },
  // Dịch vụ phòng
  { group: "Dịch vụ phòng", name: "Late Check-out Premium", points: 50 },
  { group: "Dịch vụ phòng", name: "Early Check-in VIP", points: 50 },
  { group: "Dịch vụ phòng", name: "Room Decoration Romantic", points: 100 },
  { group: "Dịch vụ phòng", name: "Birthday Surprise Setup", points: 100 },
  { group: "Dịch vụ phòng", name: "Turndown Service Premium", points: 20 },
  { group: "Dịch vụ phòng", name: "Personal Butler Service", points: 200 },
  { group: "Dịch vụ phòng", name: "Dọn phòng thêm", points: 20 },
  // Giặt ủi
  { group: "Giặt ủi", name: "Express Laundry Service", points: 40 },
  { group: "Giặt ủi", name: "Dry Cleaning Premium", points: 50 },
  { group: "Giặt ủi", name: "Shoe Cleaning & Polish", points: 20 },
  { group: "Giặt ủi", name: "Same Day Laundry", points: 30 },
  // Dịch vụ doanh nghiệp
  {
    group: "Dịch vụ doanh nghiệp",
    name: "Conference Room Half Day",
    points: 150,
  },
  { group: "Dịch vụ doanh nghiệp", name: "Business Center Access", points: 50 },
  { group: "Dịch vụ doanh nghiệp", name: "Translation Service", points: 100 },
  { group: "Dịch vụ doanh nghiệp", name: "Secretary Service", points: 150 },
  // Giải trí
  { group: "Giải trí", name: "Live Music Dinner Show", points: 100 },
  { group: "Giải trí", name: "Karaoke Room Premium", points: 80 },
  { group: "Giải trí", name: "Pool Party Weekend", points: 50 },
  { group: "Giải trí", name: "Cultural Dance Show", points: 50 },
  // Trẻ em & Gia đình
  { group: "Trẻ em & Gia đình", name: "Kids Club Full Day", points: 100 },
  { group: "Trẻ em & Gia đình", name: "Baby Sitting Service", points: 80 },
  { group: "Trẻ em & Gia đình", name: "Family Photo Session", points: 150 },
  { group: "Trẻ em & Gia đình", name: "Kids Swimming Lesson", points: 50 },
  // Sự kiện đặc biệt
  { group: "Sự kiện đặc biệt", name: "Wedding Photography", points: 500 },
  { group: "Sự kiện đặc biệt", name: "Anniversary Celebration", points: 400 },
  { group: "Sự kiện đặc biệt", name: "Proposal Setup Romantic", points: 300 },
  { group: "Sự kiện đặc biệt", name: "Honeymoon Package", points: 500 },
  // Đặt phòng
  { group: "Đặt phòng", name: "Economic", points: 30 },
  { group: "Đặt phòng", name: "Single", points: 60 },
  { group: "Đặt phòng", name: "Couple", points: 100 },
  { group: "Đặt phòng", name: "Normal", points: 100 },
  { group: "Đặt phòng", name: "Family", points: 130 },
  { group: "Đặt phòng", name: "Luxury", points: 200 },
];

const groupList = [
  "Tất cả",
  "Đặt phòng",
  "Spa & Wellness",
  "Ăn uống",
  "Vận chuyển",
  "Tour & Hoạt động",
  "Dịch vụ phòng",
  "Giặt ủi",
  "Dịch vụ doanh nghiệp",
  "Giải trí",
  "Trẻ em & Gia đình",
  "Sự kiện đặc biệt",
];

const getPointsClass = (points) => {
  if (points >= 400) return "points high-points";
  if (points >= 200) return "points medium-points";
  if (points >= 100) return "points low-medium-points";
  return "points low-points";
};

const ViewLoyaltyPoint = () => {
  const [serviceList, setServiceList] = useState(serviceListInit);
  const [group, setGroup] = useState("Tất cả");
  const [sort, setSort] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    group: groupList[1] || "",
    points: "",
    paused: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Mặc định 10 dịch vụ/trang
  const filtered =
    group === "Tất cả"
      ? serviceList
      : serviceList.filter(
          (s) =>
            s.group.trim().normalize("NFC") === group.trim().normalize("NFC")
        );
  const searchFiltered = filtered.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.group.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sorted = [...searchFiltered].sort((a, b) =>
    sort === "desc" ? b.points - a.points : a.points - b.points
  );
  const totalPages = Math.ceil(sorted.length / pageSize);
  const pagedData = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Tìm index thực trong serviceList để cập nhật đúng dịch vụ
  const getRealIndex = (service) =>
    serviceList.findIndex(
      (s) => s.name === service.name && s.group === service.group
    );

  const handleEdit = (idx) => {
    setEditValue(sorted[idx].points);
    setEditIdx(idx);
    setEditValue(sorted[idx].points);
  };

  const handleSave = (idx) => {
    const realIdx = getRealIndex(sorted[idx]);
    if (realIdx === -1) return;
    const newList = [...serviceList];
    newList[realIdx] = { ...newList[realIdx], points: Number(editValue) };
    setEditIdx(null);
    setServiceList(newList);
    setEditValue("");
    setEditIdx(null);
    setEditValue("");
  };

  const handleCancel = () => {
    setEditIdx(null);
    setEditValue("");
    setEditIdx(null);
    setEditValue("");
  };

  const handlePause = (idx) => {
    const realIdx = getRealIndex(sorted[idx]);
    if (realIdx === -1) return;
    const newList = [...serviceList];
    newList[realIdx] = {
      ...newList[realIdx],
      paused: !newList[realIdx].paused,
    };
    setServiceList(newList);
  };

  useEffect(() => {
    console.log("serviceList:", serviceList);
  }, [serviceList]);

  const handleAddService = (e) => {
    e.preventDefault();
    if (
      !newService.name.trim() ||
      !newService.group ||
      newService.points === ""
    ) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    setServiceList([
      ...serviceList,
      {
        name: newService.name.trim(),
        group: newService.group,
        paused: newService.paused,
        points: Number(newService.points),
      },
    ]);
    setShowAdd(false);
    setNewService({
      name: "",
      group: groupList[1] || "",
      points: "",
      paused: false,
    });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, group, pageSize]);

  return (
    <div className="loyalty-point-container">
      <h2>🏆 Danh sách dịch vụ & điểm thưởng</h2>
      <button
        onClick={() => setShowAdd((v) => !v)}
        className="btn-add-service"
        style={{ marginBottom: 18 }}
      >
        {showAdd ? "Đóng" : "➕ Tạo mới"}
      </button>
      {showAdd && (
        <form className="add-service-form" onSubmit={handleAddService}>
          <input
            type="text"
            placeholder="Tên dịch vụ"
            value={newService.name}
            onChange={(e) =>
              setNewService({ ...newService, name: e.target.value })
            }
            required
          />
          <select
            value={newService.group}
            onChange={(e) =>
              setNewService({ ...newService, group: e.target.value })
            }
            required
          >
            {groupList
              .filter((g) => g !== "Tất cả")
              .map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
          </select>
          <input
            type="number"
            min={0}
            placeholder="Điểm thưởng"
            value={newService.points}
            onChange={(e) =>
              setNewService({ ...newService, points: e.target.value })
            }
            required
            style={{ width: 100 }}
          />
          <select
            value={newService.paused ? "paused" : "active"}
            onChange={(e) =>
              setNewService({
                ...newService,
                paused: e.target.value === "paused",
              })
            }
          >
            <option value="active">Hoạt động</option>
            <option value="paused">Tạm dừng</option>
          </select>
          <button type="submit" className="btn-save">
            Lưu
          </button>
        </form>
      )}
      <div className="filter-row">
        <div className="filter-col">
          <label htmlFor="search">🔍Tìm kiếm:</label>
          <input
            id="search"
            type="text"
            className="search-input"
            value={searchTerm}
            placeholder="Nhập tên dịch vụ..."
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <label htmlFor="sort-select">🔄Sắp xếp:</label>
          <select
            id="sort-select"
            className="select-input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="desc">Điểm cao nhất</option>
            <option value="asc">Điểm thấp nhất</option>
          </select>
        </div>
        <div className="filter-col">
          <label htmlFor="group-select">📂Nhóm dịch vụ:</label>
          <select
            id="group-select"
            className="select-input"
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setSearchTerm("");
            }}
          >
            {groupList.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <label htmlFor="page-size-select">👁 Hiển thị:</label>
          <select
            id="page-size-select"
            className="select-input"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={{ minWidth: 70 }}
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>
      <table className="service-table">
        <thead>
          <tr>
            <th>Dịch vụ</th>
            <th>Nhóm dịch vụ</th>
            <th>Điểm thưởng</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pagedData.length === 0 ? (
            <tr className="no-data-row">
              <td colSpan={4}>
                {searchTerm
                  ? "🔍 Không tìm thấy dịch vụ phù hợp"
                  : "📋 Không có dữ liệu"}
              </td>
            </tr>
          ) : (
            pagedData.map((service, idx) => (
              <tr key={idx}>
                <td className="service-name">{service.name}</td>
                <td>
                  <span className="group-badge">{service.group}</span>
                </td>
                <td>
                  {editIdx === idx ? (
                    <input
                      type="number"
                      min={0}
                      className="edit-point-input"
                      onChange={(e) => setEditValue(e.target.value)}
                      value={editValue}
                      style={{ width: 70, textAlign: "center" }}
                    />
                  ) : (
                    <span className={getPointsClass(service.points)}>
                      {service.points.toLocaleString()}
                    </span>
                  )}
                </td>
                <td>
                  {editIdx === idx ? (
                    <>
                      <button
                        onClick={() => handleSave(idx)}
                        className="btn-save"
                      >
                        Lưu
                      </button>
                      <button className="btn-cancel" onClick={handleCancel}>
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEdit(idx)}
                      className="btn-edit"
                    >
                      Sửa
                    </button>
                  )}
                  <button
                    onClick={() => handlePause(idx)}
                    className={`btn-pause ${service.paused ? "paused" : ""}`}
                  >
                    {service.paused ? "▶" : "❚❚"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          marginBottom: 24,
        }}
      >
        <button
          className="btn-paginate"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          &lt;
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            className={`btn-paginate${currentPage === i + 1 ? " active" : ""}`}
            onClick={() => setCurrentPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
        <button
          className="btn-paginate"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          &gt;
        </button>
      </div>
      <div className="rules-section">
        <strong>Quy tắc tích điểm:</strong>
        <br />
        1,000 VND = 1 điểm
        <br />
        Điểm thưởng thêm theo từng hạng dịch vụ
        <br />
        Có thể tích lũy tối đa 10,000 điểm/tháng
        <br />
        Điểm có hiệu lực trong 12 tháng
        <br />
        Có thể quy đổi điểm để giảm giá cho lần đặt phòng/dịch vụ tiếp theo
        <br />
        <strong>Hạng thành viên:</strong>
        <br />
        Silver: 2,000 điểm
        <br />
        Gold: 4,000 điểm
        <br />
        Diamond: 8,000 điểm
        <br />
        <br />
        <strong>Lưu ý:</strong>
        <br />
        - Điểm được cộng dựa trên giá trị giao dịch và loại dịch vụ.
        <br />- Một số dịch vụ có thể có mức điểm cộng đặc biệt theo chương
        trình khuyến mãi.
      </div>
    </div>
  );
};

export default ViewLoyaltyPoint;
