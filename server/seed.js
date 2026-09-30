const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

// ---------------------------------------------------------------------------
// ElectroHub catalog: electronics only. Photos come from data/electronics-images.txt
// ("Category/Subcategory=photoId:Colour:BrandSeenInPhoto,..."). Every product uses only
// its own photo, and a brand recognised in the photo is used for its name.
// ---------------------------------------------------------------------------

let seed = 20261001;
const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (arr) => arr[Math.floor(random() * arr.length)];
const chance = (p) => random() < p;
const between = (a, b) => a + random() * (b - a);
const price99 = (v) => Math.max(499, Math.round(v / 100) * 100 - 1);
const sqlDate = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().replace('T', ' ').slice(0, 19);
const imageUrl = (id) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;
const closeUp = (id, zoom, y) => `https://images.unsplash.com/photo-${id}?w=800&h=1000&q=80&auto=format&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=${y}&fp-z=${zoom}`;

const PHONES = {
  Apple: [['iPhone 15 Pro Max', 159900, 'A17 Pro', 8], ['iPhone 15 Pro', 134900, 'A17 Pro', 8], ['iPhone 15', 79900, 'A16 Bionic', 6], ['iPhone 14', 69900, 'A15 Bionic', 6], ['iPhone 13', 59900, 'A15 Bionic', 4]],
  Samsung: [['Galaxy S24 Ultra', 129999, 'Snapdragon 8 Gen 3', 12], ['Galaxy S24', 79999, 'Exynos 2400', 8], ['Galaxy S23 FE', 49999, 'Exynos 2200', 8], ['Galaxy A55 5G', 39999, 'Exynos 1480', 8], ['Galaxy M35 5G', 19999, 'Exynos 1380', 6]],
  Google: [['Pixel 8 Pro', 106999, 'Google Tensor G3', 12], ['Pixel 8', 75999, 'Google Tensor G3', 8], ['Pixel 8a', 52999, 'Google Tensor G3', 8]],
  OnePlus: [['12', 64999, 'Snapdragon 8 Gen 3', 12], ['12R', 39999, 'Snapdragon 8 Gen 2', 8], ['Nord CE4', 24999, 'Snapdragon 7 Gen 3', 8]],
  Xiaomi: [['14', 69999, 'Snapdragon 8 Gen 3', 12], ['Redmi Note 13 Pro+', 31999, 'Dimensity 7200 Ultra', 8], ['Redmi 13C 5G', 10999, 'Dimensity 6100+', 4]],
  Motorola: [['Edge 50 Pro', 31999, 'Snapdragon 7 Gen 3', 8], ['G84 5G', 18999, 'Snapdragon 695', 8]],
};
const LAPTOPS = {
  Apple: [['MacBook Air 13 M2', 99900, 'Apple M2'], ['MacBook Air 15 M3', 134900, 'Apple M3'], ['MacBook Pro 14 M3', 169900, 'Apple M3 Pro']],
  Dell: [['Inspiron 15', 54990], ['XPS 13', 129990], ['G15 Gaming', 84990, null, true]],
  HP: [['Pavilion 15', 62990], ['Envy x360', 89990], ['Victus Gaming', 74990, null, true]],
  Lenovo: [['IdeaPad Slim 5', 64990], ['ThinkPad E14', 72990], ['Legion 5 Pro', 129990, null, true]],
  Asus: [['Vivobook 15', 44990], ['Zenbook 14 OLED', 94990], ['ROG Strix G16', 139990, null, true]],
  Acer: [['Aspire 7', 59990], ['Nitro V', 69990, null, true]],
};
const CAMERAS = {
  'DSLR Cameras': { Canon: [['EOS 1500D', 37990, 'APS-C', '24.1 MP', '1080p 30fps'], ['EOS 200D II', 59990, 'APS-C', '24.1 MP', '4K 25fps'], ['EOS 90D', 114990, 'APS-C', '32.5 MP', '4K 30fps']], Nikon: [['D5600', 58990, 'APS-C', '24.2 MP', '1080p 60fps'], ['D7500', 89990, 'APS-C', '20.9 MP', '4K 30fps'], ['D850', 249990, 'Full Frame', '45.7 MP', '4K 30fps']] },
  'Mirrorless Cameras': { Sony: [['Alpha ZV-E10', 61990, 'APS-C', '24.2 MP', '4K 30fps'], ['Alpha 6400', 78990, 'APS-C', '24.2 MP', '4K 30fps'], ['Alpha 7 IV', 214990, 'Full Frame', '33 MP', '4K 60fps']], Canon: [['EOS R50', 69990, 'APS-C', '24.2 MP', '4K 30fps'], ['EOS R8', 149990, 'Full Frame', '24.2 MP', '4K 60fps']], Nikon: [['Z50', 74990, 'APS-C', '20.9 MP', '4K 30fps'], ['Z6 II', 159990, 'Full Frame', '24.5 MP', '4K 60fps']], Fujifilm: [['X-S20', 114990, 'APS-C', '26.1 MP', '6.2K 30fps'], ['X-T5', 154990, 'APS-C', '40.2 MP', '6.2K 30fps']] },
  'Action Cameras': { GoPro: [['HERO12 Black', 37990, '1/1.9 inch', '27 MP', '5.3K 60fps'], ['HERO11 Black', 32990, '1/1.9 inch', '27 MP', '5.3K 60fps']], DJI: [['Osmo Action 4', 32990, '1/1.3 inch', '10 MP', '4K 120fps']], Insta360: [['X3', 44990, '1/2 inch', '72 MP (360°)', '5.7K 30fps']] },
};
const TVS = {
  Samsung: [['Crystal 4K Vivid', 'LED', 'Tizen', 1.2], ['Neo QLED', 'Mini LED', 'Tizen', 2.2]],
  LG: [['UR75 4K', 'LED', 'webOS', 1.15], ['OLED evo C3', 'OLED', 'webOS', 3], ['QNED80', 'QNED', 'webOS', 1.6]],
  Sony: [['Bravia X75L', 'LED', 'Google TV', 1.3], ['Bravia X80L', 'LED', 'Google TV', 1.5], ['Bravia 7', 'Mini LED', 'Google TV', 2.6]],
  TCL: [['C645 QLED', 'QLED', 'Google TV', 1.1], ['P745', 'LED', 'Google TV', 0.9]],
  Xiaomi: [['X Pro', 'LED', 'Google TV', 0.95], ['A Pro', 'LED', 'Google TV', 0.8]],
  OnePlus: [['Y1S Pro', 'LED', 'Android TV', 0.9], ['Q2 Pro', 'QLED', 'Google TV', 1.4]],
};
const FRIDGE_BRANDS = ['LG', 'Samsung', 'Whirlpool', 'Haier', 'Godrej', 'Bosch'];
const FRIDGE_TYPES = [
  ['Single Door', [185, 215, 235], 'Direct Cool', [15000, 24000]],
  ['Double Door', [242, 265, 322, 340], 'Frost Free', [25000, 45000]],
  ['Triple Door', [240, 300], 'Frost Free', [30000, 44000]],
  ['Side-by-Side', [580, 650], 'Frost Free', [69000, 115000]],
];
const AC_BRANDS = ['Daikin', 'Voltas', 'LG', 'Blue Star', 'Hitachi', 'Carrier', 'Lloyd', 'Panasonic'];
const APPLIANCES = {
  'Washing Machines': { brands: ['LG', 'Samsung', 'Bosch', 'IFB', 'Whirlpool'], types: [['Front Load', 32000, 46000], ['Top Load', 16000, 26000], ['Semi-Automatic', 10000, 15000]] },
  'Microwave Ovens': { brands: ['LG', 'Samsung', 'IFB', 'Panasonic', 'Morphy Richards'], types: [['Solo', 6000, 9000], ['Grill', 8000, 12000], ['Convection', 11000, 19000]] },
  'Vacuum Cleaners': { brands: ['Dyson', 'Eureka Forbes', 'Philips', 'Xiaomi', 'Karcher'], types: [['Cordless Stick', 18000, 52000], ['Robotic', 17000, 45000], ['Wet & Dry', 6000, 12000], ['Canister', 7000, 14000]] },
};

const IPADS = [['iPad (10th Gen)', 34900, 'A14 Bionic', '10.9 inch Liquid Retina'], ['iPad Air 11 (M2)', 59900, 'Apple M2', '11 inch Liquid Retina'], ['iPad Pro 11 (M4)', 99900, 'Apple M4', '11 inch Ultra Retina XDR'], ['iPad mini (6th Gen)', 49900, 'A15 Bionic', '8.3 inch Liquid Retina']];
const TABLETS = {
  Samsung: [['Galaxy Tab S9 FE', 36999, 'Exynos 1380', '10.9 inch'], ['Galaxy Tab S9', 72999, 'Snapdragon 8 Gen 2', '11 inch AMOLED'], ['Galaxy Tab A9+', 18999, 'Snapdragon 695', '11 inch']],
  Lenovo: [['Tab P12', 26999, 'Dimensity 7050', '12.7 inch 3K'], ['Tab M11', 14999, 'Helio G88', '11 inch']],
  Xiaomi: [['Pad 6', 26999, 'Snapdragon 870', '11 inch 2.8K'], ['Redmi Pad SE', 12999, 'Snapdragon 680', '11 inch']],
  OnePlus: [['Pad 2', 39999, 'Snapdragon 8 Gen 3', '12.1 inch 3K'], ['Pad Go', 19999, 'Helio G99', '11.35 inch 2.4K']],
};
const HEADPHONES = {
  Sony: [['WH-1000XM5', 34990, 'Over-Ear', 'Active', '30 hrs'], ['WH-CH720N', 12990, 'Over-Ear', 'Active', '35 hrs']],
  Bose: [['QuietComfort Ultra', 35900, 'Over-Ear', 'Active', '24 hrs'], ['QuietComfort 45', 29900, 'Over-Ear', 'Active', '24 hrs']],
  JBL: [['Tune 770NC', 7999, 'Over-Ear', 'Active', '70 hrs'], ['Tune 520BT', 3999, 'On-Ear', 'None', '57 hrs']],
  Apple: [['AirPods Max', 59900, 'Over-Ear', 'Active', '20 hrs']],
  Sennheiser: [['Momentum 4 Wireless', 34990, 'Over-Ear', 'Active', '60 hrs']],
  boAt: [['Rockerz 550', 1999, 'Over-Ear', 'None', '20 hrs'], ['Nirvana 751 ANC', 3999, 'Over-Ear', 'Active', '65 hrs']],
};
const WATCHES = {
  Apple: [['Watch Series 9 GPS 45 mm', 44900, '45 mm', '18 hrs', 'iOS'], ['Watch SE GPS 40 mm', 29900, '40 mm', '18 hrs', 'iOS'], ['Watch Ultra 2', 89900, '49 mm', '36 hrs', 'iOS']],
  Samsung: [['Galaxy Watch6 44 mm', 32999, '44 mm', '40 hrs', 'Android'], ['Galaxy Watch6 Classic 47 mm', 39999, '47 mm', '40 hrs', 'Android']],
  Garmin: [['Venu 3', 49990, '45 mm', '14 days', 'Android & iOS'], ['Forerunner 265', 49990, '46 mm', '13 days', 'Android & iOS']],
  Noise: [['ColorFit Pro 5', 4499, '1.85 inch', '7 days', 'Android & iOS']],
  Amazfit: [['GTR 4', 16999, '46 mm', '14 days', 'Android & iOS']],
  boAt: [['Wave Sigma', 1999, '2.01 inch', '7 days', 'Android & iOS']],
};
const POWER_BANKS = {
  Anker: [['PowerCore 10000', 2199, 10000, '22.5W'], ['737 Power Bank', 10999, 24000, '140W']],
  Xiaomi: [['Power Bank 3i', 1999, 20000, '18W'], ['Pocket Power Bank', 1499, 10000, '22.5W']],
  Ambrane: [['Stylo 20K', 1699, 20000, '20W'], ['Aerosync Wireless', 2499, 10000, '15W Wireless']],
  boAt: [['EnergyShroom PB300', 1999, 20000, '22.5W']],
  Belkin: [['BoostCharge Pro Magnetic', 4999, 5000, '7.5W Wireless']],
  Portronics: [['Luxcell B 20K', 1799, 20000, '22.5W']],
};
const ADAPTERS = {
  Apple: [['20W USB-C Power Adapter', 1900, '20W', '1 x USB-C', 'PD 3.0'], ['35W Dual USB-C Power Adapter', 5800, '35W', '2 x USB-C', 'PD 3.0']],
  Samsung: [['25W Super Fast Charger', 1699, '25W', '1 x USB-C', 'PPS'], ['45W Super Fast Charger', 3499, '45W', '1 x USB-C', 'PPS']],
  Anker: [['Nano 30W Charger', 2499, '30W', '1 x USB-C', 'GaN, PD 3.0'], ['735 GaN 65W Charger', 4999, '65W', '2 x USB-C + 1 x USB-A', 'GaN, PD 3.0']],
  Belkin: [['BoostCharge 45W Dual Charger', 3999, '45W', '2 x USB-C', 'PD 3.0']],
  OnePlus: [['SUPERVOOC 80W Power Adapter', 2999, '80W', '1 x USB-A', 'SUPERVOOC']],
  Portronics: [['Adapto 20W Charger', 699, '20W', '1 x USB-C + 1 x USB-A', 'PD, QC 3.0']],
};

// Picks a brand: the one recognised in the photo if we sell it, otherwise rotate through the list
const brandFor = (seen, brands, i) => (brands.includes(seen) ? seen : brands[i % brands.length]);

// Each builder returns { brand, name, subcategory?, price, specs, about }
const BUILDERS = {
  Smartphones: (seen, color, i) => {
    const brand = brandFor(seen, Object.keys(PHONES), i);
    const [model, base, chip, ram] = pick(PHONES[brand]);
    const storage = pick(brand === 'Apple' || base > 60000 ? [128, 256, 512] : [128, 256]);
    const apple = brand === 'Apple';
    return {
      brand,
      name: `${brand} ${model} (${color}, ${apple ? '' : `${ram} GB RAM, `}${storage} GB)`,
      price: base + (storage === 256 ? (apple ? 10000 : 6000) : storage === 512 ? (apple ? 30000 : 16000) : 0),
      specs: {
        RAM: `${ram} GB`, Storage: `${storage} GB`, Display: `${pick(apple ? ['6.1', '6.7'] : ['6.4', '6.6', '6.7', '6.8'])} inch ${apple ? 'Super Retina XDR' : 'AMOLED'}`,
        Processor: chip, 'Rear Camera': apple ? (model.includes('Pro') ? '48 MP Triple' : '48 MP Dual') : pick(['50 MP Triple', '50 MP Dual', '108 MP Triple', '200 MP Quad']),
        'Front Camera': apple ? '12 MP' : pick(['13 MP', '16 MP', '32 MP']), Battery: apple ? pick(['3349 mAh', '4383 mAh']) : pick(['5000 mAh', '5500 mAh']),
        Network: '5G', OS: apple ? 'iOS 17' : 'Android 14', Warranty: '1 Year Manufacturer Warranty',
      },
      about: 'Flagship-grade performance, an all-day battery and a pro camera system in your pocket.',
    };
  },
  Laptops: (seen, color, i) => {
    const brand = brandFor(seen, Object.keys(LAPTOPS), i);
    const [model, base, chip, gaming] = pick(LAPTOPS[brand]);
    const apple = brand === 'Apple';
    const processor = chip || pick(['Intel Core i5 13th Gen', 'Intel Core i7 13th Gen', 'AMD Ryzen 5 7535HS', 'AMD Ryzen 7 7840HS', 'Intel Core Ultra 7']);
    const ram = gaming ? 16 : pick(apple ? [8, 16] : [8, 16, 16, 32]);
    const storage = pick(apple ? ['256 GB SSD', '512 GB SSD'] : ['512 GB SSD', '1 TB SSD']);
    const display = apple ? (model.includes('15') ? '15.3 inch' : model.includes('Pro') ? '14.2 inch' : '13.6 inch') : pick(gaming ? ['15.6 inch', '16 inch'] : ['14 inch', '15.6 inch']);
    return {
      brand,
      name: `${brand} ${model} Laptop (${processor}, ${ram} GB, ${storage})`,
      price: base + (ram === 32 ? 18000 : ram === 16 && !gaming ? 8000 : 0) + (storage.startsWith('1 TB') ? 7000 : storage.startsWith('512') && apple ? 20000 : 0),
      specs: {
        Processor: processor, RAM: `${ram} GB`, Storage: storage, Display: display,
        Graphics: apple ? 'Integrated Apple GPU' : gaming ? pick(['NVIDIA RTX 4050 6 GB', 'NVIDIA RTX 4060 8 GB']) : 'Integrated',
        OS: apple ? 'macOS' : 'Windows 11 Home', Usage: gaming ? 'Gaming' : 'Everyday & Work', Weight: gaming ? '2.3 kg' : pick(['1.2 kg', '1.4 kg', '1.7 kg']),
        Warranty: '1 Year Manufacturer Warranty',
      },
      about: 'Fast, cool and quiet, with a crisp display and long battery life for work, study and play.',
    };
  },
  Cameras: (seen, color, i, sub) => {
    const models = CAMERAS[sub];
    const brand = brandFor(seen, Object.keys(models), i);
    const [model, base, sensor, mp, video] = pick(models[brand]);
    const type = sub.replace(' Cameras', '');
    const kit = type === 'Action' ? 'Fixed wide-angle lens' : chance(0.6) ? '18-55 mm kit lens' : 'Body only';
    return {
      brand,
      name: `${brand} ${model} ${mp} ${type} Camera${kit === '18-55 mm kit lens' ? ' with 18-55 mm Lens' : type === 'Action' ? '' : ' (Body Only)'}`,
      price: base + (kit === '18-55 mm kit lens' ? 8000 : 0),
      specs: { Type: type, Sensor: sensor, Resolution: mp, Video: video, Lens: kit, Connectivity: 'Wi-Fi, Bluetooth', Warranty: '2 Years Manufacturer Warranty' },
      about: 'Sharp, vibrant photos and smooth video with fast autofocus and intuitive controls.',
    };
  },
  'Smart TVs': (seen, color, i) => {
    const brand = brandFor(seen, Object.keys(TVS), i);
    const [model, panel, os, factor] = pick(TVS[brand]);
    const size = pick(panel === 'OLED' || panel === 'Mini LED' ? [55, 65, 75] : [32, 43, 50, 55, 65]);
    const resolution = size === 32 ? 'HD Ready' : size === 43 && chance(0.4) ? 'Full HD' : '4K Ultra HD';
    return {
      brand,
      name: `${brand} ${model} ${Math.round(size * 2.54)} cm (${size} inch) ${resolution} Smart ${panel} TV (${os})`,
      price: price99(size * size * 12 * factor + 6000),
      specs: {
        'Screen Size': `${size} inch`, Resolution: resolution, 'Display Type': panel, 'Refresh Rate': factor >= 1.5 ? '120 Hz' : '60 Hz',
        'Smart OS': os, 'Sound Output': pick(['20 W', '30 W', '40 W Dolby Atmos']), 'HDMI Ports': String(pick([2, 3, 4])), Warranty: '1 Year Comprehensive Warranty',
      },
      about: 'Stunning picture quality, immersive sound and all your favourite streaming apps built in.',
    };
  },
  Refrigerators: (seen, color, i) => {
    const brand = brandFor(seen, FRIDGE_BRANDS, i);
    const [type, caps, defrost, [lo, hi]] = pick(FRIDGE_TYPES);
    const cap = pick(caps);
    const star = type === 'Side-by-Side' ? 3 : pick(type === 'Single Door' ? [2, 3, 4, 5] : [2, 3, 3]);
    return {
      brand, subcategory: type,
      name: `${brand} ${cap} L ${star} Star ${defrost} ${type} Refrigerator (${color})`,
      price: price99(between(lo, hi) + star * 800),
      specs: {
        Type: type, Capacity: `${cap} L`, 'Energy Rating': `${star} Star`, Defrost: defrost, Compressor: chance(0.8) ? 'Inverter' : 'Reciprocatory',
        Convertible: type === 'Double Door' && chance(0.5) ? 'Yes' : 'No', Warranty: '1 Year on Product, 10 Years on Compressor',
      },
      about: 'Keeps food fresh for longer with even cooling, smart storage and low running costs.',
    };
  },
  ACs: (seen, color, i, sub) => {
    const brand = brandFor(seen, AC_BRANDS, i);
    const type = sub === 'Window ACs' ? 'Window' : 'Split';
    const tons = pick(type === 'Window' ? ['1 Ton', '1.5 Ton'] : ['1 Ton', '1.5 Ton', '1.5 Ton', '2 Ton']);
    const star = pick(['3 Star', '5 Star']);
    const inverter = type === 'Split' || chance(0.4);
    const base = 30000 + (tons === '1.5 Ton' ? 6000 : tons === '2 Ton' ? 13000 : 0) + (star === '5 Star' ? 6000 : 0);
    return {
      brand,
      name: `${brand} ${tons} ${star} ${inverter ? 'Inverter ' : ''}${type} AC (Copper, ${color === 'Black' || color === 'Red' ? 'White' : color})`,
      price: price99(base * (type === 'Window' ? 0.82 : 1) * (['Daikin', 'Hitachi'].includes(brand) ? 1.08 : 1)),
      specs: {
        Type: type, Capacity: tons, 'Energy Rating': star, Inverter: inverter ? 'Yes' : 'No', Condenser: 'Copper',
        'Room Size': tons === '1 Ton' ? 'Up to 110 sq ft' : tons === '1.5 Ton' ? '111 to 150 sq ft' : '151 to 200 sq ft',
        Refrigerant: 'R32', Warranty: '1 Year on Product, 10 Years on Compressor',
      },
      about: 'Fast, even cooling with low power use, anti-bacterial filters and a quiet indoor unit.',
    };
  },
  Appliances: (seen, color, i, sub) => {
    const spec = APPLIANCES[sub];
    const brand = brandFor(seen, spec.brands, i);
    const [type, lo, hi] = pick(spec.types);
    let name; let specs;
    if (sub === 'Washing Machines') {
      const kg = pick([6, 7, 8, 9]);
      name = `${brand} ${kg} kg 5 Star ${type === 'Semi-Automatic' ? '' : 'Inverter '}${type} Washing Machine (${color})`;
      specs = { Type: type, Capacity: `${kg} kg`, 'Energy Rating': '5 Star', 'Spin Speed': type === 'Front Load' ? pick(['1200 RPM', '1400 RPM']) : '700 RPM', 'Inverter Motor': type === 'Semi-Automatic' ? 'No' : 'Yes', Warranty: '2 Years on Product, 10 Years on Motor' };
    } else if (sub === 'Microwave Ovens') {
      const litres = type === 'Solo' ? pick([20, 23]) : pick([23, 28, 32]);
      name = `${brand} ${litres} L ${type} Microwave Oven (${color})`;
      specs = { Type: type, Capacity: `${litres} L`, Power: pick(['800 W', '900 W', '1000 W']), 'Auto Cook Menus': String(pick([50, 100, 200])), Warranty: '1 Year on Product, 5 Years on Magnetron' };
    } else {
      name = `${brand} ${type} Vacuum Cleaner (${color})`;
      specs = { Type: type, Power: type === 'Robotic' ? '40 W' : pick(['600 W', '1200 W', '1600 W']), Bagless: 'Yes', 'Dust Capacity': pick(['0.5 L', '0.8 L', '15 L', '20 L']), Warranty: '1 Year Manufacturer Warranty' };
    }
    return { brand, name, price: price99(between(lo, hi) * (brand === 'Dyson' ? 1.4 : 1)), specs, about: 'Reliable, energy-efficient and easy to use, built for Indian homes.' };
  },
};

BUILDERS.iPads = (seen, color) => {
  const [model, base, chip, display] = pick(IPADS);
  const storage = pick(model.includes('Pro') ? [256, 512] : [64, 128, 256].slice(model.includes('Air') ? 1 : 0));
  const cellular = chance(0.3);
  return {
    brand: 'Apple',
    name: `Apple ${model} ${cellular ? 'Wi-Fi + Cellular' : 'Wi-Fi'} ${storage} GB (${color})`,
    price: base + (storage >= 256 ? 10000 : 0) + (storage === 512 ? 20000 : 0) + (cellular ? 15000 : 0),
    specs: { Display: display, Chip: chip, Storage: `${storage} GB`, Connectivity: cellular ? 'Wi-Fi + Cellular' : 'Wi-Fi', 'Rear Camera': '12 MP', 'Apple Pencil': model.includes('Pro') || model.includes('Air') ? 'Apple Pencil Pro' : 'Apple Pencil (USB-C)', Battery: 'Up to 10 hours', OS: 'iPadOS 17', Warranty: '1 Year Manufacturer Warranty' },
    about: 'Powerful, portable and versatile for notes, streaming, drawing and work on the go.',
  };
};
BUILDERS.Tablets = (seen, color, i) => {
  const brand = brandFor(seen, Object.keys(TABLETS), i);
  const [model, base, chip, display] = pick(TABLETS[brand]);
  const ram = base > 30000 ? pick([8, 12]) : pick([4, 6, 8]);
  const storage = base > 30000 ? pick([128, 256]) : pick([64, 128]);
  const lte = chance(0.3);
  return {
    brand,
    name: `${brand} ${model} (${ram} GB RAM, ${storage} GB, ${lte ? 'Wi-Fi + 5G' : 'Wi-Fi'}, ${color})`,
    price: base + (storage === 256 ? 6000 : 0) + (lte ? 5000 : 0),
    specs: { Display: display, Processor: chip, RAM: `${ram} GB`, Storage: `${storage} GB`, Connectivity: lte ? 'Wi-Fi + 5G' : 'Wi-Fi', Battery: pick(['7040 mAh', '8000 mAh', '8840 mAh', '9510 mAh']), 'Stylus Support': base > 25000 ? 'Yes' : 'No', OS: 'Android 14', Warranty: '1 Year Manufacturer Warranty' },
    about: 'A big, bright screen for streaming, study and gaming with long battery life.',
  };
};
BUILDERS.Headphones = (seen, color, i) => {
  const brand = brandFor(seen, Object.keys(HEADPHONES), i);
  const [model, base, type, anc, battery] = pick(HEADPHONES[brand]);
  return {
    brand,
    name: `${brand} ${model} Wireless ${anc === 'Active' ? 'Noise Cancelling ' : ''}Headphones (${color})`,
    price: base,
    specs: { Type: type, Connectivity: 'Bluetooth 5.3', 'Noise Cancellation': anc === 'Active' ? 'Active (ANC)' : 'No', 'Battery Life': battery, 'Driver Size': pick(['30 mm', '40 mm', '50 mm']), Microphone: 'Yes', 'Fast Charging': 'Yes', Warranty: '1 Year Manufacturer Warranty' },
    about: 'Rich, detailed sound with deep bass, comfortable cushions and all-day battery.',
  };
};
BUILDERS.Smartwatches = (seen, color, i) => {
  const brand = brandFor(seen, Object.keys(WATCHES), i);
  const [model, base, size, battery, os] = pick(WATCHES[brand]);
  return {
    brand,
    name: `${brand} ${model} Smartwatch (${color} Strap)`,
    price: base,
    specs: { Display: 'AMOLED', 'Case / Screen Size': size, 'Battery Life': battery, GPS: base > 10000 ? 'Built-in GPS' : 'Connected GPS', 'Water Resistance': base > 10000 ? '5 ATM' : 'IP68', 'Bluetooth Calling': 'Yes', 'Health Tracking': 'Heart rate, SpO2, Sleep', 'Compatible With': os, Warranty: '1 Year Manufacturer Warranty' },
    about: 'Track your health and fitness, take calls and get notifications right on your wrist.',
  };
};
BUILDERS['Power Banks'] = (seen, color, i) => {
  const brand = brandFor(seen, Object.keys(POWER_BANKS), i);
  const [model, base, mah, output] = pick(POWER_BANKS[brand]);
  return {
    brand,
    name: `${brand} ${model} ${mah} mAh ${output} Power Bank (${color})`,
    price: base,
    specs: { Capacity: `${mah} mAh`, 'Max Output': output, Ports: mah >= 20000 ? '2 x USB-A + 1 x USB-C' : '1 x USB-A + 1 x USB-C', 'Fast Charging': 'PD 3.0 & QC 3.0', Wireless: output.includes('Wireless') ? 'Yes' : 'No', Weight: mah >= 20000 ? '420 g' : '220 g', Warranty: '1 Year Manufacturer Warranty' },
    about: 'Charge your phone, earbuds and more on the go, with multi-layer safety protection.',
  };
};
BUILDERS.Adapters = (seen, color, i) => {
  const brand = brandFor(seen, Object.keys(ADAPTERS), i);
  const [model, base, watts, ports, tech] = pick(ADAPTERS[brand]);
  return {
    brand,
    name: `${brand} ${model} (${color === 'Black' ? 'Black' : 'White'})`,
    price: base,
    specs: { Type: 'Wall Charger', Output: watts, Ports: ports, Technology: tech, 'Cable Included': chance(0.4) ? 'Yes' : 'No', 'Compatible With': 'Phones, tablets & laptops (USB-C)', Warranty: '1 Year Manufacturer Warranty' },
    about: 'Fast, safe charging with built-in protection against overheating and overcharging.',
  };
};

const GROUPS = {
  'Mobiles/Smartphones': BUILDERS.Smartphones,
  'Laptops/Laptops': BUILDERS.Laptops,
  'Cameras/DSLR Cameras': BUILDERS.Cameras,
  'Cameras/Mirrorless Cameras': BUILDERS.Cameras,
  'Cameras/Action Cameras': BUILDERS.Cameras,
  'TVs/Smart TVs': BUILDERS['Smart TVs'],
  'Refrigerators/Refrigerators': BUILDERS.Refrigerators,
  'Air Conditioners/Split ACs': BUILDERS.ACs,
  'Air Conditioners/Window ACs': BUILDERS.ACs,
  'Home Appliances/Washing Machines': BUILDERS.Appliances,
  'Home Appliances/Microwave Ovens': BUILDERS.Appliances,
  'Home Appliances/Vacuum Cleaners': BUILDERS.Appliances,
  'Tablets/iPads': BUILDERS.iPads,
  'Tablets/Tablets': BUILDERS.Tablets,
  'Accessories/Headphones': BUILDERS.Headphones,
  'Accessories/Smartwatches': BUILDERS.Smartwatches,
  'Accessories/Power Banks': BUILDERS['Power Banks'],
  'Accessories/Adapters': BUILDERS.Adapters,
};

const REVIEW_TEXT = {
  5: ['Excellent product, works exactly as described. Highly recommended!', 'Superb performance and build quality. Fast delivery too.', 'Worth every rupee. Setup was quick and easy.', 'Very happy with this purchase, the features are fantastic.'],
  4: ['Very good product. Packaging could have been better.', 'Great value for money, performs well for daily use.', 'Good product, installation took a day longer than expected.'],
  3: ['Decent for the price, but nothing extraordinary.', 'Works fine, although battery/energy use is a bit higher than claimed.'],
  2: ['Average performance, expected more from this brand.', 'Had a minor issue, customer support helped but it took time.'],
  1: ['Received a faulty unit, had to get it replaced.'],
};
const REVIEWERS = ['Aarav Mehta', 'Priya Sharma', 'Rohan Iyer', 'Ananya Gupta', 'Vikram Singh', 'Sneha Reddy', 'Kabir Khan', 'Isha Patel', 'Arjun Nair', 'Meera Joshi', 'Aditya Rao', 'Diya Kapoor'];

const loadImages = () => {
  const map = {};
  fs.readFileSync(path.join(__dirname, 'data', 'electronics-images.txt'), 'utf8').split(/\r?\n/).filter(Boolean).forEach(line => {
    const [key, list] = line.split('=');
    map[key] = list.split(',').map(entry => { const [id, color, brand] = entry.split(':'); return { id, color, brand }; });
  });
  return map;
};

const generateProducts = () => {
  const images = loadImages();
  const products = [];
  for (const [key, build] of Object.entries(GROUPS)) {
    const [category, sub] = key.split('/');
    (images[key] || []).forEach((photo, i) => {
      const p = build(photo.brand, photo.color, i, sub);
      const discount = pick([5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40]);
      const stockRoll = random();
      products.push({
        name: p.name, brand: p.brand, category, subcategory: p.subcategory || sub, gender: 'Unisex',
        description: `${p.name}. ${p.about}`,
        price: price99(p.price * (100 / (100 - discount))), discount_percent: discount,
        rating: Math.round(between(3.6, 4.8) * 10) / 10, rating_count: Math.round(Math.exp(between(Math.log(20), Math.log(12000)))),
        stock: stockRoll < 0.05 ? 0 : stockRoll < 0.15 ? Math.round(between(1, 5)) : Math.round(between(10, 120)),
        colors: JSON.stringify([photo.color]), sizes: '[]',
        images: JSON.stringify([imageUrl(photo.id), closeUp(photo.id, 1.6, 0.5), closeUp(photo.id, 2.2, 0.45)]),
        specs: JSON.stringify(p.specs),
        created_at: sqlDate(between(0, 120)),
      });
    });
  }
  return products;
};

const seedDatabase = async () => {
  try {
    console.log('Seeding database...');
    db.exec(`
      DELETE FROM order_status_history; DELETE FROM inventory_movements; DELETE FROM order_items; DELETE FROM orders;
      DELETE FROM addresses; DELETE FROM wishlist_items; DELETE FROM cart_items; DELETE FROM reviews;
      DELETE FROM coupons; DELETE FROM offers; DELETE FROM products; DELETE FROM users;
      UPDATE sqlite_sequence SET seq = 0;
    `);

    const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, phone, gender, role) VALUES (?, ?, ?, ?, ?, ?)');
    insertUser.run('Demo User', 'demo@electrohub.com', await bcrypt.hash('Demo@123', 10), '9876543210', null, 'customer');
    insertUser.run('Store Admin', 'admin@electrohub.com', await bcrypt.hash('Admin@123', 10), null, null, 'admin');
    const reviewerHash = await bcrypt.hash(`${Date.now()}-${Math.random()}`, 4);
    const reviewerIds = REVIEWERS.map((name, i) => insertUser.run(name, `reviewer${i + 1}@example.com`, reviewerHash, null, null, 'customer').lastInsertRowid);

    const insertCoupon = db.prepare(`INSERT INTO coupons (code, discount_type, discount_value, min_order, expires_at) VALUES (?, ?, ?, ?, datetime('now', '+1 year'))`);
    insertCoupon.run('WELCOME10', 'PERCENTAGE', 10, 500);
    insertCoupon.run('FLAT1000', 'FLAT', 1000, 15000);
    insertCoupon.run('BANK7', 'PERCENTAGE', 7, 30000);
    insertCoupon.run('MEGA5000', 'FLAT', 5000, 75000);

    const insertOffer = db.prepare('INSERT INTO offers (title, subtitle, cta_label, link, image, placement, position) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const u = (id, w) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;
    insertOffer.run('Upgrade your tech', 'Laptops, phones and more from the brands you trust, with up to 40% off.', 'Shop laptops', '/products/Laptops', u('1496181133206-80ce9b88a853', 1400), 'hero', 1);
    insertOffer.run('Latest smartphones', 'iPhone, Galaxy, Pixel & more', 'Shop mobiles', '/products/Mobiles', u('1511707171634-5f897ff02aa9', 900), 'hero', 2);
    insertOffer.run('4K Smart TVs', 'Big screens, bigger savings', 'Explore', '/products/TVs', u('1593359677879-a4bb92f829d1', 700), 'hero', 3);
    insertOffer.run('Cameras for creators', 'DSLR, mirrorless & action', 'Explore', '/products/Cameras', u('1502982720700-bfff97f2ecac', 700), 'hero', 4);
    ['Free delivery on orders above ₹999', 'Use code WELCOME10 for 10% off your first order', 'Flat ₹1,000 off above ₹15,000 with FLAT1000',
      'Pay instantly with any UPI app: scan the QR at checkout', 'Brand warranty on every product · 7-day replacement',
    ].forEach((text, i) => insertOffer.run(text, null, null, null, null, 'ticker', i + 1));

    const products = generateProducts();
    const insertProduct = db.prepare(`
      INSERT INTO products (name, brand, description, category, subcategory, gender, price, discount_percent, rating, rating_count, stock, colors, sizes, images, specs, created_at)
      VALUES (@name, @brand, @description, @category, @subcategory, @gender, @price, @discount_percent, @rating, @rating_count, @stock, @colors, @sizes, @images, @specs, @created_at)
    `);
    const insertMovement = db.prepare("INSERT INTO inventory_movements (product_id, change, stock_after, reason, reference, created_at) VALUES (?, ?, ?, 'Initial stock', 'Opening balance', ?)");
    const insertReview = db.prepare('INSERT INTO reviews (user_id, product_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)');
    let reviewCount = 0;
    db.transaction(() => {
      for (const p of products) {
        const id = insertProduct.run(p).lastInsertRowid;
        insertMovement.run(id, p.stock, p.stock, p.created_at);
        if (chance(0.6)) {
          for (const userId of [...reviewerIds].sort(() => random() - 0.5).slice(0, Math.round(between(2, 5)))) {
            const rating = Math.min(5, Math.max(1, Math.round(p.rating + between(-1.3, 1))));
            insertReview.run(userId, id, rating, pick(REVIEW_TEXT[rating]), sqlDate(between(0, 90)));
            reviewCount++;
          }
        }
      }
    })();

    const perCat = db.prepare('SELECT category, COUNT(*) AS n FROM products GROUP BY category').all().map(r => `${r.category}: ${r.n}`).join(', ');
    console.log(`Seeded ${products.length} products (${perCat}) and ${reviewCount} reviews.`);
    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exitCode = 1;
  }
};

seedDatabase();
