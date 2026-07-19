function parseServicePrice(text) {
    if (!text) return null;
    const match = text.toLowerCase().match(/(?:dịch vụ|dvc|rác|vệ sinh).*?(\d+([.,]\d+)*)[k\s]*(?:\/|trên|1\s*)(người|ng|phòng|p)/) 
               || text.toLowerCase().match(/(\d+([.,]\d+)*)[k\s]*(?:\/|trên|1\s*)(người|ng|phòng|p)/);
    if (!match) return null;
    let priceStr = match[1].replace(/[.,]/g, '');
    let price = parseInt(priceStr, 10);
    if (price < 1000) price *= 1000;
    return price;
}

const texts = [
    "mạng 100k/phòng",
    "rác 120.000/người; vệ sinh/điện chung",
    "Dịch vụ khác: vệ sinh/điện chung, thang máy, rác 120k/người",
    "thang máy, rác 200.000/phòng",
    "rác 120/người"
];
texts.forEach(t => console.log(t, '=>', parseServicePrice(t)));
