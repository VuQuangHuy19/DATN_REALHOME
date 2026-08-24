/**
 * Tự động nhận diện Quận/Huyện tại Hà Nội từ Tên đường / Địa chỉ hoặc Cột Khu vực trên Sheet
 */
export function detectHanoiDistrict(address: string, areaFromCell?: string): string {
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

  if (!address) return 'Đống Đa';

  const norm = address.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // 1. Tây Hồ
  if (
    norm.includes('tay ho') || norm.includes('an duong') || norm.includes('an duong vuong') || 
    norm.includes('au co') || norm.includes('bui trang chuoc') || norm.includes('buoi') || 
    norm.includes('dang thai mai') || norm.includes('do nhuan') || norm.includes('hoang hoa tham') || 
    norm.includes('hong ha') || norm.includes('hung vuong') || norm.includes('lac long quan') || 
    norm.includes('mai xuan thuong') || norm.includes('nguyen dinh thi') || norm.includes('nguyen hoang ton') || 
    norm.includes('nhat chieu') || norm.includes('phan dinh phung') || norm.includes('phu gia') || 
    norm.includes('phu minh') || norm.includes('phu thuong') || norm.includes('phu xa') || 
    norm.includes('phuc hoa') || norm.includes('quang an') || norm.includes('quang ba') || 
    norm.includes('quang khanh') || norm.includes('thanh nien') || norm.includes('thuong thuy') || 
    norm.includes('thuy khue') || norm.includes('to ngoc van') || norm.includes('trinh cong son') || 
    norm.includes('tu hoa') || norm.includes('tu lien') || norm.includes('vo chi cong') || 
    norm.includes('vu mien') || norm.includes('xuan dieu') || norm.includes('xuan la') || 
    norm.includes('yen hoa') || norm.includes('yen phu')
  ) {
    return 'Tây Hồ'.normalize('NFC');
  }

  // 2. Cầu Giấy
  if (
    norm.includes('cau giay') || norm.includes('chua ha') || norm.includes('dang thuy tram') || 
    norm.includes('dich vong') || norm.includes('dich vong hau') || norm.includes('do quang') || 
    norm.includes('doan ke thien') || norm.includes('duong dinh nghe') || norm.includes('duong khue') || 
    norm.includes('duong quang ham') || norm.includes('duy tan') || norm.includes('dai lo thang long') || 
    norm.includes('ha yen') || norm.includes('ho tung mau') || norm.includes('hoa bang') || 
    norm.includes('hoang dao thuy') || norm.includes('hoang minh giam') || norm.includes('hoang ngan') || 
    norm.includes('hoang quoc viet') || norm.includes('hoang sam') || norm.includes('khuat duy tien') || 
    norm.includes('le duc tho') || norm.includes('le van luong') || norm.includes('mac thai to') || 
    norm.includes('mac thai tong') || norm.includes('mai dich') || norm.includes('nghia do') || 
    norm.includes('nghia tan') || norm.includes('nguyen chanh') || norm.includes('nguyen dinh hoan') || 
    norm.includes('nguyen kha trac') || norm.includes('nguyen khang') || norm.includes('nguyen khanh toan') || 
    norm.includes('nguyen phong sac') || norm.includes('nguyen thi dinh') || norm.includes('nguyen thi due') || 
    norm.includes('nguyen thuong hien') || norm.includes('nguyen van huyen') || norm.includes('pham hung') || 
    norm.includes('pham than duat') || norm.includes('pham tuan tai') || norm.includes('pham van dong') || 
    norm.includes('phan van truong') || norm.includes('phung chi kien') || norm.includes('quan hoa') || 
    norm.includes('thanh thai') || norm.includes('tho thap') || norm.includes('to hieu') || 
    norm.includes('ton that thuyet') || norm.includes('tran binh') || norm.includes('tran cung') || 
    norm.includes('tran dang ninh') || norm.includes('tran duoi') || norm.includes('tran kim xuyen') || 
    norm.includes('tran quoc hoan') || norm.includes('tran quoc vuong') || norm.includes('tran thai tong') || 
    norm.includes('trung hoa') || norm.includes('trung yen') || norm.includes('truong cong giai') || 
    norm.includes('vu pham ham') || norm.includes('xuan thuy') || norm.includes('yen hoa')
  ) {
    return 'Cầu Giấy'.normalize('NFC');
  }

  // 3. Đống Đa
  if (
    norm.includes('dong da') || norm.includes('an trach') || norm.includes('bich cau') || 
    norm.includes('cat linh') || norm.includes('cau moi') || norm.includes('chua boc') || 
    norm.includes('chua lang') || norm.includes('dang tien dong') || norm.includes('dang tran cua') || 
    norm.includes('dang van ngu') || norm.includes('dao duy anh') || norm.includes('doan thi diem') || 
    norm.includes('dong tac') || norm.includes('giang vo') || norm.includes('hang chao') || 
    norm.includes('ho dam tron') || norm.includes('ho giam') || norm.includes('ho sen') || 
    norm.includes('hoang cau') || norm.includes('hoang ngoc phach') || norm.includes('hoang tich tri') || 
    norm.includes('huynh thuc khang') || norm.includes('kham thien') || norm.includes('khuong thuong') || 
    norm.includes('kim hoa') || norm.includes('la thanh') || norm.includes('lang') || 
    norm.includes('lang ha') || norm.includes('le duan') || norm.includes('luong dinh cua') || 
    norm.includes('ly van phuc') || norm.includes('mai anh tuan') || norm.includes('nam dong') || 
    norm.includes('ngo si lien') || norm.includes('ngo tat to') || norm.includes('nguyen khuyen') || 
    norm.includes('nguyen luong bang') || norm.includes('nguyen ngoc vu') || norm.includes('nguyen nhu do') || 
    norm.includes('nguyen trai') || norm.includes('pham ngoc thach') || norm.includes('phan van tri') || 
    norm.includes('phuong mai') || norm.includes('quoc tu giam') || norm.includes('tay son') || 
    norm.includes('thai ha') || norm.includes('thai thinh') || norm.includes('ton duc thang') || 
    norm.includes('ton that tung') || norm.includes('trinh hoai duc') || norm.includes('truoc dong') || 
    norm.includes('trung liet') || norm.includes('truong chinh') || norm.includes('vong duc') || 
    norm.includes('vu thanh') || norm.includes('vu ngoc phan') || norm.includes('yen lang')
  ) {
    return 'Đống Đa'.normalize('NFC');
  }

  // 4. Thanh Xuân
  if (
    norm.includes('thanh xuan') || norm.includes('bui xuong trach') || norm.includes('chinh kinh') || 
    norm.includes('cu loc') || norm.includes('dinh cong') || norm.includes('giai phong') || 
    norm.includes('hoang dao thanh') || norm.includes('hoang van thai') || norm.includes('khuat duy tien') || 
    norm.includes('khuong dinh') || norm.includes('khuong ha') || norm.includes('khuong trung') || 
    norm.includes('kim giang') || norm.includes('le trong tan') || norm.includes('le van luong') || 
    norm.includes('luong the vinh') || norm.includes('nguyen ngoc nai') || norm.includes('nguyen huy tuong') || 
    norm.includes('nguyen trai') || norm.includes('nguyen tuong') || norm.includes('nguyen xuan khoat') || 
    norm.includes('phan dinh giot') || norm.includes('phuong liet') || norm.includes('quan nhan') || 
    norm.includes('thanh xuan bac') || norm.includes('thanh xuan nam') || norm.includes('thanh xuan trung') || 
    norm.includes('to vinh dien') || norm.includes('tran dien') || norm.includes('trieu viet vuong') || 
    norm.includes('truong chinh') || norm.includes('vong') || norm.includes('vu huu') || 
    norm.includes('vu tong phan') || norm.includes('vu trong phung')
  ) {
    return 'Thanh Xuân'.normalize('NFC');
  }

  // 5. Nam Từ Liêm
  if (
    norm.includes('nam tu liem') || norm.includes('bui xuan phai') || norm.includes('cau dien') || 
    norm.includes('chau van liem') || norm.includes('cung tri thuc') || norm.includes('da ton') || 
    norm.includes('dai mỗ') || norm.includes('dai mo') || norm.includes('dinh thon') || 
    norm.includes('do duc duc') || norm.includes('dong me') || norm.includes('ham nghi') || 
    norm.includes('hoang cong chat') || norm.includes('le duc tho') || norm.includes('le quang dao') || 
    norm.includes('luong the vinh') || norm.includes('me tri') || norm.includes('me tri ha') || 
    norm.includes('me tri thuong') || norm.includes('mieu nha') || norm.includes('my dinh') || 
    norm.includes('nguyen co thach') || norm.includes('nguyen hoang') || norm.includes('nguyen van giap') || 
    norm.includes('nguyen xuan nguyen') || norm.includes('nhue giang') || norm.includes('pham hung') || 
    norm.includes('phu do') || norm.includes('phung khoang') || norm.includes('phuong canh') || 
    norm.includes('sa doi') || norm.includes('tay mo') || norm.includes('thanh binh') || 
    norm.includes('to huu') || norm.includes('ton that thuyet') || norm.includes('trinh van bo') || 
    norm.includes('trung van') || norm.includes('tu liem') || norm.includes('xuan phuong')
  ) {
    return 'Nam Từ Liêm'.normalize('NFC');
  }

  // 6. Bắc Từ Liêm
  if (
    norm.includes('bac tu liem') || norm.includes('an duong vuong') || norm.includes('cau dien') || 
    norm.includes('co nhue') || norm.includes('dang thuy tram') || norm.includes('do nhuan') || 
    norm.includes('dong ngac') || norm.includes('duc thang') || norm.includes('hoang cong chat') || 
    norm.includes('hoang quoc viet') || norm.includes('hoang tang secret') || norm.includes('kieumai') || 
    norm.includes('kieu mai') || norm.includes('le van hien') || norm.includes('lien mieu') || 
    norm.includes('minh khai') || norm.includes('ngo phuc lai') || norm.includes('nguyen hoang ton') || 
    norm.includes('nguyen xuan khoat') || norm.includes('nhat tao') || norm.includes('pham van dong') || 
    norm.includes('phan ba van') || norm.includes('phu dien') || norm.includes('phu kieu') || 
    norm.includes('phuc dien') || norm.includes('phuc la') || norm.includes('su pham') || 
    norm.includes('tây tựu') || norm.includes('tay tuu') || norm.includes('thuy phuong') || 
    norm.includes('tran cung') || norm.includes('trung tuu') || norm.includes('van tri') || 
    norm.includes('xuan dinh') || norm.includes('xuan tao')
  ) {
    return 'Bắc Từ Liêm'.normalize('NFC');
  }

  // 7. Ba Đình
  if (
    norm.includes('ba dinh') || norm.includes('an xa') || norm.includes('bà huyện thanh quan') || 
    norm.includes('cao bat quat') || norm.includes('chu van an') || norm.includes('dang dung') || 
    norm.includes('dang tat') || norm.includes('dao tan') || norm.includes('doi can') || 
    norm.includes('doi nhan') || norm.includes('giang vo') || norm.includes('hang bun') || 
    norm.includes('hang cot') || norm.includes('hang than') || norm.includes('hoang hoa tham') || 
    norm.includes('hoang van thu') || norm.includes('kim ma') || norm.includes('lac long quan') || 
    norm.includes('lang ha') || norm.includes('le hong phong') || norm.includes('lieu giai') || 
    norm.includes('ly nam de') || norm.includes('nam cao') || norm.includes('nam trang') || 
    norm.includes('nguyen chi thanh') || norm.includes('nguyen cong trug') || norm.includes('nguyen khac nhu') || 
    norm.includes('nguyen thai hoc') || norm.includes('nguyen trung truc') || norm.includes('nguyen truong to') || 
    norm.includes('pham hong thai') || norm.includes('phan dinh phung') || norm.includes('phan ke binh') || 
    norm.includes('quoc tu giam') || norm.includes('son tay') || norm.includes('tan tap') || 
    norm.includes('thanh nien') || norm.includes('ton that thieo') || norm.includes('tran phu') || 
    norm.includes('trinh hoai duc') || norm.includes('truong han sieu') || norm.includes('van cao') || 
    norm.includes('vạn phúc') || norm.includes('van phuc') || norm.includes('vinh phuc') || 
    norm.includes('yen the')
  ) {
    return 'Ba Đình'.normalize('NFC');
  }

  // 8. Hai Bà Trưng
  if (
    norm.includes('hai ba trung') || norm.includes('bach dang') || norm.includes('bach mai') || 
    norm.includes('bui thi xuan') || norm.includes('cam hoi') || norm.includes('cao dat') || 
    norm.includes('da ton') || norm.includes('dai co viet') || norm.includes('dai la') || 
    norm.includes('do hanh') || norm.includes('doan tran nghiep') || norm.includes('doi cung') || 
    norm.includes('giai phong') || norm.includes('hang chuoi') || norm.includes('hoa ma') || 
    norm.includes('hoang mai') || norm.includes('hong mai') || norm.includes('huong vien') || 
    norm.includes('kim nguu') || norm.includes('lac trung') || norm.includes('le gia dinh') || 
    norm.includes('le ngoc han') || norm.includes('le thanh tong') || norm.includes('le van huong') || 
    norm.includes('lo duc') || norm.includes('luong yen') || norm.includes('minh khai') || 
    norm.includes('ngo thi nham') || norm.includes('nguyen an ninh') || norm.includes('nguyen cao') || 
    norm.includes('nguyen cong tru') || norm.includes('nguyen dinh chieu') || norm.includes('nguyen du') || 
    norm.includes('nguyen hien') || norm.includes('nguyen huy tu') || norm.includes('nguyen khoai') || 
    norm.includes('nguyen thuong hien') || norm.includes('pham dinh ho') || norm.includes('phung khac khoan') || 
    norm.includes('quang trung') || norm.includes('ta quang buu') || norm.includes('thanh nhan') || 
    norm.includes('tran binh trong') || norm.includes('tran cao van') || norm.includes('tran khac chan') || 
    norm.includes('tran khanh du') || norm.includes('tran nhan tong') || norm.includes('tran thanh tong') || 
    norm.includes('trieu viet vuong') || norm.includes('truong dinh') || norm.includes('tue tinh') || 
    norm.includes('vong duc') || norm.includes('y jersin') || norm.includes('yen lac')
  ) {
    return 'Hai Bà Trưng'.normalize('NFC');
  }

  // 9. Hà Đông
  if (
    norm.includes('ha dong') || norm.includes('an hoa') || norm.includes('ao sen') || 
    norm.includes('ba la') || norm.includes('bien giang') || norm.includes('bui luong') || 
    norm.includes('cao thang') || norm.includes('cau am') || norm.includes('chu van an') || 
    norm.includes('dai mỗ') || norm.includes('dai mo') || norm.includes('ha tri') || 
    norm.includes('hoang dieu') || norm.includes('hoang hoa tham') || norm.includes('hoang van thu') || 
    norm.includes('khuong ha') || norm.includes('le hong phong') || norm.includes('le lai') || 
    norm.includes('le loi') || norm.includes('le trong tan') || norm.includes('luong ngoc quyen') || 
    norm.includes('luong van tuy') || norm.includes('mo lao') || norm.includes('ngo gia kham') || 
    norm.includes('ngo quyen') || norm.includes('nguyen khuyen') || norm.includes('nguyen trai') || 
    norm.includes('nguyen van loc') || norm.includes('nguyen van troi') || norm.includes('nhan hue') || 
    norm.includes('phan dinh giot') || norm.includes('phan chu trinh') || norm.includes('phan huy chu') || 
    norm.includes('phu la') || norm.includes('phu lam') || norm.includes('phung hung') || 
    norm.includes('quang trung') || norm.includes('tan trieu') || norm.includes('thach hoa') || 
    norm.includes('thanh binh') || norm.includes('thieu mai') || norm.includes('to huu') || 
    norm.includes('tran dung') || norm.includes('tran phu') || norm.includes('van phuc') || 
    norm.includes('van quan') || norm.includes('xa la') || norm.includes('yen phuc') || 
    norm.includes('yen xot')
  ) {
    return 'Hà Đông'.normalize('NFC');
  }

  // 10. Hoàng Mai
  if (
    norm.includes('hoang mai') || norm.includes('bang liet') || norm.includes('bui huy bich') || 
    norm.includes('bui xuong trach') || norm.includes('dai tu') || norm.includes('dinh cong') || 
    norm.includes('dinh cong ha') || norm.includes('dinh cong thuong') || norm.includes('dong tan') || 
    norm.includes('giai phong') || norm.includes('giap bat') || norm.includes('giap nhich') || 
    norm.includes('hoang liet') || norm.includes('khuyen luong') || norm.includes('kim giang') || 
    norm.includes('kim nguu') || norm.includes('linh dam') || norm.includes('linh nam') || 
    norm.includes('nguu khoat') || norm.includes('nguyen an ninh') || norm.includes('nguyen canh dung') || 
    norm.includes('nguyen duc canh') || norm.includes('nguyen duy trinh') || norm.includes('nguyen huu tho') || 
    norm.includes('nguyen xi') || norm.includes('so dau') || norm.includes('tam trinh') || 
    norm.includes('tan mai') || norm.includes('thanh dam') || norm.includes('thanh liet') || 
    norm.includes('thinh liet') || norm.includes('trinh dinh cuu') || norm.includes('trung dinh') || 
    norm.includes('truong dinh') || norm.includes('vinh hung') || norm.includes('vũ tông phan')
  ) {
    return 'Hoàng Mai'.normalize('NFC');
  }

  // 11. Hoàn Kiếm
  if (
    norm.includes('hoan kiem') || norm.includes('ba trieu') || norm.includes('bao khanh') || 
    norm.includes('cau go') || norm.includes('cha ca') || norm.includes('cu loc') || 
    norm.includes('dinh liet') || norm.includes('dong xuan') || norm.includes('hai ba trung') || 
    norm.includes('hang bac') || norm.includes('hang bo') || norm.includes('hang bong') || 
    norm.includes('hang buom') || norm.includes('hang buot') || norm.includes('hang ca') || 
    norm.includes('hang gai') || norm.includes('hang hom') || norm.includes('hang ma') || 
    norm.includes('hang mắm') || norm.includes('hang mam') || norm.includes('hang quat') || 
    norm.includes('hang Trong') || norm.includes('hang trong') || norm.includes('le thai to') || 
    norm.includes('ly thai to') || norm.includes('ly thuong kiet') || norm.includes('ngo quyen') || 
    norm.includes('nha tho') || norm.includes('phan chu trinh') || norm.includes('phung hung') || 
    norm.includes('quang trung') || norm.includes('trang thi') || norm.includes('trang tien')
  ) {
    return 'Hoàn Kiếm'.normalize('NFC');
  }

  // 12. Long Biên
  if (
    norm.includes('long bien') || norm.includes('ai quoc') || norm.includes('bo de') || 
    norm.includes('co linh') || norm.includes('dang vu hy') || norm.includes('doan khue') || 
    norm.includes('gia thuy') || norm.includes('giang bien') || norm.includes('hoa lam') || 
    norm.includes('hoang nhu tiep') || norm.includes('huong sen') || norm.includes('kieu ky') || 
    norm.includes('lam ha') || norm.includes('le manh trinh') || norm.includes('ngo gia tu') || 
    norm.includes('nguyen cao luyen') || norm.includes('nguyen duc thuan') || norm.includes('nguyen son') || 
    norm.includes('nguyen van cu') || norm.includes('nguyen van linh') || norm.includes('pham van dong') || 
    norm.includes('phuc loi') || norm.includes('sai dong') || norm.includes('thach ban') || 
    norm.includes('thuong thanh') || norm.includes('viet hung') || norm.includes('vinh tuy')
  ) {
    return 'Long Biên'.normalize('NFC');
  }

  // Fallback mặc định
  return 'Đống Đa'.normalize('NFC');
}
