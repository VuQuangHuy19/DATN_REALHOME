/**
 * Tự động nhận diện Quận/Huyện tại Hà Nội từ Tên đường / Địa chỉ hoặc Cột Khu vực trên Sheet
 */
export function detectHanoiDistrict(address: string, areaFromCell?: string): string {
  const normAddr = (address || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

  // 1. Kiểm tra từ Tên đường / Địa chỉ của Tòa nhà
  if (normAddr) {
    // Tây Hồ
    if (
      normAddr.includes('tay ho') || normAddr.includes('an duong') || normAddr.includes('an duong vuong') || 
      normAddr.includes('au co') || normAddr.includes('bui trang chuoc') || normAddr.includes('buoi') || 
      normAddr.includes('dang thai mai') || normAddr.includes('do nhuan') || normAddr.includes('hoang hoa tham') || 
      normAddr.includes('hong ha') || normAddr.includes('hung vuong') || normAddr.includes('lac long quan') || 
      normAddr.includes('mai xuan thuong') || normAddr.includes('nguyen dinh thi') || normAddr.includes('nguyen hoang ton') || 
      normAddr.includes('nhat chieu') || normAddr.includes('phan dinh phung') || normAddr.includes('phu gia') || 
      normAddr.includes('phu minh') || normAddr.includes('phu thuong') || normAddr.includes('phu xa') || 
      normAddr.includes('phuc hoa') || normAddr.includes('quang an') || normAddr.includes('quang ba') || 
      normAddr.includes('quang khanh') || normAddr.includes('thanh nien') || normAddr.includes('thuong thuy') || 
      normAddr.includes('thuy khue') || normAddr.includes('to ngoc van') || normAddr.includes('trinh cong son') || 
      normAddr.includes('tu hoa') || normAddr.includes('tu lien') || normAddr.includes('vo chi cong') || 
      normAddr.includes('vu mien') || normAddr.includes('xuan dieu') || normAddr.includes('xuan la') || 
      normAddr.includes('yen hoa') || normAddr.includes('yen phu')
    ) {
      return 'Tây Hồ'.normalize('NFC');
    }

    // Cầu Giấy
    if (
      normAddr.includes('cau giay') || normAddr.includes('tran duy hung') || normAddr.includes('nguyen ngoc vu') ||
      normAddr.includes('chua ha') || normAddr.includes('dang thuy tram') || 
      normAddr.includes('dich vong') || normAddr.includes('dich vong hau') || normAddr.includes('do quang') || 
      normAddr.includes('doan ke thien') || normAddr.includes('duong dinh nghe') || normAddr.includes('duong khue') || 
      normAddr.includes('duong quang ham') || normAddr.includes('duy tan') || normAddr.includes('dai lo thang long') || 
      normAddr.includes('ha yen') || normAddr.includes('ho tung mau') || normAddr.includes('hoa bang') || 
      normAddr.includes('hoang dao thuy') || normAddr.includes('hoang minh giam') || normAddr.includes('hoang ngan') || 
      normAddr.includes('hoang quoc viet') || normAddr.includes('hoang sam') || normAddr.includes('khuat duy tien') || 
      normAddr.includes('le duc tho') || normAddr.includes('le van luong') || normAddr.includes('mac thai to') || 
      normAddr.includes('mac thai tong') || normAddr.includes('mai dich') || normAddr.includes('nghia do') || 
      normAddr.includes('nghia tan') || normAddr.includes('nguyen chanh') || normAddr.includes('nguyen dinh hoan') || 
      normAddr.includes('nguyen kha trac') || normAddr.includes('nguyen khang') || normAddr.includes('nguyen khanh toan') || 
      normAddr.includes('nguyen phong sac') || normAddr.includes('nguyen thi dinh') || normAddr.includes('nguyen thi due') || 
      normAddr.includes('nguyen thuong hien') || normAddr.includes('nguyen van huyen') || normAddr.includes('pham hung') || 
      normAddr.includes('pham than duat') || normAddr.includes('pham tuan tai') || normAddr.includes('pham van dong') || 
      normAddr.includes('phan van truong') || normAddr.includes('phung chi kien') || normAddr.includes('quan hoa') || 
      normAddr.includes('thanh thai') || normAddr.includes('tho thap') || normAddr.includes('to hieu') || 
      normAddr.includes('ton that thuyet') || normAddr.includes('tran binh') || normAddr.includes('tran cung') || 
      normAddr.includes('tran dang ninh') || normAddr.includes('tran duoi') || normAddr.includes('tran kim xuyen') || 
      normAddr.includes('tran quoc hoan') || normAddr.includes('tran quoc vuong') || normAddr.includes('tran thai tong') || 
      normAddr.includes('trung hoa') || normAddr.includes('trung yen') || normAddr.includes('truong cong giai') || 
      normAddr.includes('vu pham ham') || normAddr.includes('xuan thuy') || normAddr.includes('yen hoa')
    ) {
      return 'Cầu Giấy'.normalize('NFC');
    }

    // Thanh Xuân
    if (
      normAddr.includes('thanh xuan') || normAddr.includes('quan nhan') || normAddr.includes('ha dinh') || 
      normAddr.includes('chinh kinh') || normAddr.includes('giap nhat') || normAddr.includes('khuong trung') || 
      normAddr.includes('khuong dinh') || normAddr.includes('khuong ha') || normAddr.includes('nguyen ngoc nai') || 
      normAddr.includes('dhhn') || normAddr.includes('dai hoc ha noi') || normAddr.includes('bui xuong trach') || 
      normAddr.includes('cu loc') || normAddr.includes('giai phong') || 
      normAddr.includes('hoang dao thanh') || normAddr.includes('hoang van thai') || normAddr.includes('khuat duy tien') || 
      normAddr.includes('kim giang') || normAddr.includes('le trong tan') || normAddr.includes('le van luong') || 
      normAddr.includes('luong the vinh') || normAddr.includes('nguyen huy tuong') || 
      normAddr.includes('nguyen trai') || normAddr.includes('nguyen tuong') || normAddr.includes('nguyen xuan khoat') || 
      normAddr.includes('phan dinh giot') || normAddr.includes('phuong liet') || 
      normAddr.includes('thanh xuan bac') || normAddr.includes('thanh xuan nam') || normAddr.includes('thanh xuan trung') || 
      normAddr.includes('to vinh dien') || normAddr.includes('tran dien') || normAddr.includes('trieu viet vuong') || 
      normAddr.includes('truong chinh') || normAddr.includes('vu huu') || 
      normAddr.includes('vu tong phan') || normAddr.includes('vu trong phung')
    ) {
      return 'Thanh Xuân'.normalize('NFC');
    }

    // Đống Đa
    if (
      normAddr.includes('dong da') || normAddr.includes('an trach') || normAddr.includes('bich cau') || 
      normAddr.includes('cat linh') || normAddr.includes('cau moi') || normAddr.includes('chua boc') || 
      normAddr.includes('chua lang') || normAddr.includes('dang tien dong') || normAddr.includes('dang tran cua') || 
      normAddr.includes('dang van ngu') || normAddr.includes('dao duy anh') || normAddr.includes('doan thi diem') || 
      normAddr.includes('dong tac') || normAddr.includes('giang vo') || normAddr.includes('hang chao') || 
      normAddr.includes('hoang an') || normAddr.includes('hoang cau') || normAddr.includes('hoang ngoc phach') || normAddr.includes('hoang tich tri') || 
      normAddr.includes('huynh thuc khang') || normAddr.includes('kham thien') || normAddr.includes('khuong thuong') || 
      normAddr.includes('kim hoa') || normAddr.includes('la thanh') || normAddr.includes('duong lang') || normAddr.includes('phao dai lang') || 
      normAddr.includes('lang ha') || normAddr.includes('le duan') || normAddr.includes('luong dinh cua') || 
      normAddr.includes('ly van phuc') || normAddr.includes('mai anh tuan') || normAddr.includes('nam dong') || 
      normAddr.includes('ngo si lien') || normAddr.includes('ngo tat to') || normAddr.includes('nguyen chi thanh') || normAddr.includes('nguyen khuyen') || 
      normAddr.includes('nguyen luong bang') || normAddr.includes('nguyen nhu do') || 
      normAddr.includes('pham ngoc thach') || normAddr.includes('phan van tri') || 
      normAddr.includes('phuong mai') || normAddr.includes('quoc tu giam') || normAddr.includes('tay son') || 
      normAddr.includes('thai ha') || normAddr.includes('thai thinh') || normAddr.includes('ton duc thang') || 
      normAddr.includes('ton that tung') || normAddr.includes('trinh hoai duc') || normAddr.includes('truoc dong') || 
      normAddr.includes('trung liet') || normAddr.includes('truong chinh') || normAddr.includes('vong duc') || 
      normAddr.includes('vu thanh') || normAddr.includes('vu ngoc phan') || normAddr.includes('yen lang')
    ) {
      return 'Đống Đa'.normalize('NFC');
    }

    // Hoàng Mai
    if (
      normAddr.includes('hoang mai') || normAddr.includes('bang liet') || normAddr.includes('bui huy bich') || 
      normAddr.includes('bui xuong trach') || normAddr.includes('dai tu') || normAddr.includes('dinh cong') || 
      normAddr.includes('dinh cong ha') || normAddr.includes('dinh cong thuong') || normAddr.includes('dong tan') || 
      normAddr.includes('giai phong') || normAddr.includes('giap bat') || normAddr.includes('giap nhich') || 
      normAddr.includes('hoang liet') || normAddr.includes('khuyen luong') || normAddr.includes('kim giang') || 
      normAddr.includes('kim nguu') || normAddr.includes('linh dam') || normAddr.includes('linh nam') || 
      normAddr.includes('nguu khoat') || normAddr.includes('nguyen an ninh') || normAddr.includes('nguyen canh dung') || 
      normAddr.includes('nguyen duc canh') || normAddr.includes('nguyen duy trinh') || normAddr.includes('nguyen huu tho') || 
      normAddr.includes('nguyen xi') || normAddr.includes('so dau') || normAddr.includes('tam trinh') || 
      normAddr.includes('tan mai') || normAddr.includes('thanh dam') || normAddr.includes('thanh liet') || 
      normAddr.includes('thinh liet') || normAddr.includes('trinh dinh cuu') || normAddr.includes('trung dinh') || 
      normAddr.includes('truong dinh') || normAddr.includes('vinh hung') || normAddr.includes('vũ tông phan')
    ) {
      return 'Hoàng Mai'.normalize('NFC');
    }

    // Nam Từ Liêm
    if (
      normAddr.includes('nam tu liem') || normAddr.includes('bui xuan phai') || normAddr.includes('cau dien') || 
      normAddr.includes('chau van liem') || normAddr.includes('cung tri thuc') || normAddr.includes('da ton') || 
      normAddr.includes('dai mỗ') || normAddr.includes('dai mo') || normAddr.includes('dinh thon') || 
      normAddr.includes('do duc duc') || normAddr.includes('dong me') || normAddr.includes('ham nghi') || 
      normAddr.includes('hoang cong chat') || normAddr.includes('le duc tho') || normAddr.includes('le quang dao') || 
      normAddr.includes('luong the vinh') || normAddr.includes('me tri') || normAddr.includes('me tri ha') || 
      normAddr.includes('me tri thuong') || normAddr.includes('mieu nha') || normAddr.includes('my dinh') || 
      normAddr.includes('nguyen co thach') || normAddr.includes('nguyen hoang') || normAddr.includes('nguyen van giap') || 
      normAddr.includes('nguyen xuan nguyen') || normAddr.includes('nhue giang') || normAddr.includes('pham hung') || 
      normAddr.includes('phu do') || normAddr.includes('phung khoang') || normAddr.includes('phuong canh') || 
      normAddr.includes('sa doi') || normAddr.includes('tay mo') || normAddr.includes('thanh binh') || 
      normAddr.includes('to huu') || normAddr.includes('ton that thuyet') || normAddr.includes('trinh van bo') || 
      normAddr.includes('trung van') || normAddr.includes('tu liem') || normAddr.includes('xuan phuong')
    ) {
      return 'Nam Từ Liêm'.normalize('NFC');
    }

    // Bắc Từ Liêm
    if (
      normAddr.includes('bac tu liem') || normAddr.includes('an duong vuong') || normAddr.includes('cau dien') || 
      normAddr.includes('co nhue') || normAddr.includes('dang thuy tram') || normAddr.includes('do nhuan') || 
      normAddr.includes('dong ngac') || normAddr.includes('duc thang') || normAddr.includes('hoang cong chat') || 
      normAddr.includes('hoang quoc viet') || normAddr.includes('kieumai') || normAddr.includes('kieu mai') || 
      normAddr.includes('le van hien') || normAddr.includes('lien mieu') || 
      normAddr.includes('minh khai') || normAddr.includes('ngo phuc lai') || normAddr.includes('nguyen hoang ton') || 
      normAddr.includes('nguyen xuan khoat') || normAddr.includes('nhat tao') || normAddr.includes('pham van dong') || 
      normAddr.includes('phan ba van') || normAddr.includes('phu dien') || normAddr.includes('phu kieu') || 
      normAddr.includes('phuc dien') || normAddr.includes('phuc la') || normAddr.includes('su pham') || 
      normAddr.includes('tay tuu') || normAddr.includes('thuy phuong') || 
      normAddr.includes('tran cung') || normAddr.includes('trung tuu') || normAddr.includes('van tri') || 
      normAddr.includes('xuan dinh') || normAddr.includes('xuan tao')
    ) {
      return 'Bắc Từ Liêm'.normalize('NFC');
    }

    // Ba Đình
    if (
      normAddr.includes('ba dinh') || normAddr.includes('an xa') || normAddr.includes('ba huyen thanh quan') || 
      normAddr.includes('cao bat quat') || normAddr.includes('chu van an') || normAddr.includes('dang dung') || 
      normAddr.includes('dang tat') || normAddr.includes('dao tan') || normAddr.includes('doi can') || 
      normAddr.includes('doi nhan') || normAddr.includes('giang vo') || normAddr.includes('hang bun') || 
      normAddr.includes('hang cot') || normAddr.includes('hang than') || normAddr.includes('hoang hoa tham') || 
      normAddr.includes('hoang van thu') || normAddr.includes('kim ma') || normAddr.includes('lac long quan') || 
      normAddr.includes('lang ha') || normAddr.includes('le hong phong') || normAddr.includes('lieu giai') || 
      normAddr.includes('ly nam de') || normAddr.includes('nam cao') || normAddr.includes('nam trang') || 
      normAddr.includes('nguyen chi thanh') || normAddr.includes('nguyen cong trug') || normAddr.includes('nguyen khac nhu') || 
      normAddr.includes('nguyen thai hoc') || normAddr.includes('nguyen trung truc') || normAddr.includes('nguyen truong to') || 
      normAddr.includes('pham hong thai') || normAddr.includes('phan dinh phung') || normAddr.includes('phan ke binh') || 
      normAddr.includes('quoc tu giam') || normAddr.includes('son tay') || normAddr.includes('tan tap') || 
      normAddr.includes('thanh nien') || normAddr.includes('tran phu') || 
      normAddr.includes('trinh hoai duc') || normAddr.includes('van cao') || 
      normAddr.includes('van phuc') || normAddr.includes('vinh phuc') || normAddr.includes('yen the')
    ) {
      return 'Ba Đình'.normalize('NFC');
    }

    // Hai Bà Trưng
    if (
      normAddr.includes('hai ba trung') || normAddr.includes('bach dang') || normAddr.includes('bach mai') || 
      normAddr.includes('bui thi xuan') || normAddr.includes('cam hoi') || normAddr.includes('cao dat') || 
      normAddr.includes('dai co viet') || normAddr.includes('dai la') || 
      normAddr.includes('do hanh') || normAddr.includes('doan tran nghiep') || normAddr.includes('doi cung') || 
      normAddr.includes('giai phong') || normAddr.includes('hang chuoi') || normAddr.includes('hoa ma') || 
      normAddr.includes('hoang mai') || normAddr.includes('hong mai') || normAddr.includes('huong vien') || 
      normAddr.includes('kim nguu') || normAddr.includes('lac trung') || normAddr.includes('le gia dinh') || 
      normAddr.includes('le ngoc han') || normAddr.includes('le thanh tong') || normAddr.includes('le van huong') || 
      normAddr.includes('lo duc') || normAddr.includes('luong yen') || normAddr.includes('minh khai') || 
      normAddr.includes('ngo thi nham') || normAddr.includes('nguyen an ninh') || normAddr.includes('nguyen cao') || 
      normAddr.includes('nguyen cong tru') || normAddr.includes('nguyen dinh chieu') || normAddr.includes('nguyen du') || 
      normAddr.includes('nguyen hien') || normAddr.includes('nguyen huy tu') || normAddr.includes('nguyen khoai') || 
      normAddr.includes('nguyen thuong hien') || normAddr.includes('pham dinh ho') || normAddr.includes('phung khac khoan') || 
      normAddr.includes('quang trung') || normAddr.includes('ta quang buu') || normAddr.includes('thanh nhan') || 
      normAddr.includes('tran binh trong') || normAddr.includes('tran cao van') || normAddr.includes('tran khac chan') || 
      normAddr.includes('tran khanh du') || normAddr.includes('tran nhan tong') || normAddr.includes('tran thanh tong') || 
      normAddr.includes('trieu viet vuong') || normAddr.includes('truong dinh') || normAddr.includes('tue tinh') || 
      normAddr.includes('yen lac')
    ) {
      return 'Hai Bà Trưng'.normalize('NFC');
    }

    // Hà Đông
    if (
      normAddr.includes('ha dong') || normAddr.includes('an hoa') || normAddr.includes('ao sen') || 
      normAddr.includes('ba la') || normAddr.includes('bien giang') || normAddr.includes('bui luong') || 
      normAddr.includes('cao thang') || normAddr.includes('cau am') || normAddr.includes('chu van an') || 
      normAddr.includes('dai mo') || normAddr.includes('ha tri') || 
      normAddr.includes('hoang dieu') || normAddr.includes('hoang hoa tham') || normAddr.includes('hoang van thu') || 
      normAddr.includes('khuong ha') || normAddr.includes('le hong phong') || normAddr.includes('le lai') || 
      normAddr.includes('le loi') || normAddr.includes('le trong tan') || normAddr.includes('luong ngoc quyen') || 
      normAddr.includes('luong van tuy') || normAddr.includes('mo lao') || normAddr.includes('ngo gia kham') || 
      normAddr.includes('ngo quyen') || normAddr.includes('nguyen khuyen') || normAddr.includes('nguyen trai') || 
      normAddr.includes('nguyen van loc') || normAddr.includes('nguyen van troi') || normAddr.includes('nhan hue') || 
      normAddr.includes('phan dinh giot') || normAddr.includes('phan chu trinh') || normAddr.includes('phan huy chu') || 
      normAddr.includes('phu la') || normAddr.includes('phu lam') || normAddr.includes('phung hung') || 
      normAddr.includes('quang trung') || normAddr.includes('tan trieu') || normAddr.includes('thach hoa') || 
      normAddr.includes('thanh binh') || normAddr.includes('thieu mai') || normAddr.includes('to huu') || 
      normAddr.includes('tran dung') || normAddr.includes('tran phu') || normAddr.includes('van phuc') || 
      normAddr.includes('van quan') || normAddr.includes('xa la') || normAddr.includes('yen phuc') || 
      normAddr.includes('yen xot')
    ) {
      return 'Hà Đông'.normalize('NFC');
    }

    // Hoàn Kiếm
    if (
      normAddr.includes('hoan kiem') || normAddr.includes('ba trieu') || normAddr.includes('bao khanh') || 
      normAddr.includes('cau go') || normAddr.includes('cha ca') || normAddr.includes('cu loc') || 
      normAddr.includes('dinh liet') || normAddr.includes('dong xuan') || normAddr.includes('hai ba trung') || 
      normAddr.includes('hang bac') || normAddr.includes('hang bo') || normAddr.includes('hang bong') || 
      normAddr.includes('hang buom') || normAddr.includes('hang buot') || normAddr.includes('hang ca') || 
      normAddr.includes('hang gai') || normAddr.includes('hang hom') || normAddr.includes('hang ma') || 
      normAddr.includes('hang mam') || normAddr.includes('hang quat') || 
      normAddr.includes('hang trong') || normAddr.includes('le thai to') || 
      normAddr.includes('ly thai to') || normAddr.includes('ly thuong kiet') || normAddr.includes('ngo quyen') || 
      normAddr.includes('nha tho') || normAddr.includes('phan chu trinh') || normAddr.includes('phung hung') || 
      normAddr.includes('quang trung') || normAddr.includes('trang thi') || normAddr.includes('trang tien')
    ) {
      return 'Hoàn Kiếm'.normalize('NFC');
    }

    // Long Biên
    if (
      normAddr.includes('long bien') || normAddr.includes('ai quoc') || normAddr.includes('bo de') || 
      normAddr.includes('co linh') || normAddr.includes('dang vu hy') || normAddr.includes('doan khue') || 
      normAddr.includes('gia thuy') || normAddr.includes('giang bien') || normAddr.includes('hoa lam') || 
      normAddr.includes('hoang nhu tiep') || normAddr.includes('huong sen') || normAddr.includes('kieu ky') || 
      normAddr.includes('lam ha') || normAddr.includes('le manh trinh') || normAddr.includes('ngo gia tu') || 
      normAddr.includes('nguyen cao luyen') || normAddr.includes('nguyen duc thuan') || normAddr.includes('nguyen son') || 
      normAddr.includes('nguyen van cu') || normAddr.includes('nguyen van linh') || normAddr.includes('pham van dong') || 
      normAddr.includes('phuc loi') || normAddr.includes('sai dong') || normAddr.includes('thach ban') || 
      normAddr.includes('thuong thanh') || normAddr.includes('viet hung') || normAddr.includes('vinh tuy')
    ) {
      return 'Long Biên'.normalize('NFC');
    }
  }

  // 2. Nếu tên đường không khớp quận nào cụ thể, sử dụng giá trị ô Cột Khu Vực từ Sheet (nếu có)
  if (areaFromCell && areaFromCell.trim().length >= 3) {
    const cleanArea = areaFromCell.trim();
    const norm = cleanArea.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (norm.includes('cau giay')) return 'Cầu Giấy';
    if (norm.includes('tay ho')) return 'Tây Hồ';
    if (norm.includes('thanh xuan')) return 'Thanh Xuân';
    if (norm.includes('dong da')) return 'Đống Đa';
    if (norm.includes('ba dinh')) return 'Ba Đình';
    if (norm.includes('hoan kiem')) return 'Hoàn Kiếm';
    if (norm.includes('nam tu liem')) return 'Nam Từ Liêm';
    if (norm.includes('bac tu liem')) return 'Bắc Từ Liêm';
    if (norm.includes('hai ba trung')) return 'Hai Bà Trưng';
    if (norm.includes('hoang mai')) return 'Hoàng Mai';
    if (norm.includes('ha dong')) return 'Hà Đông';
    if (norm.includes('long bien')) return 'Long Biên';
    if (norm.includes('hoai duc')) return 'Hoài Đức';
    return cleanArea;
  }

  // Fallback mặc định
  return 'Đống Đa'.normalize('NFC');
}
