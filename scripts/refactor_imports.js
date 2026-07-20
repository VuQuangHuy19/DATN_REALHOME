const fs = require('fs');
const path = require('path');

const hookMap = {
  useBuildings: '@/src/features/properties/hooks/useBuildings',
  useLandlords: '@/src/features/properties/hooks/useLandlords',
  useRoomImages: '@/src/features/properties/hooks/useRoomImages',
  useBuildingServices: '@/src/features/properties/hooks/useBuildingServices',
  
  useRooms: '@/src/features/rooms/hooks/useRooms',
  useRoomsByBuilding: '@/src/features/rooms/hooks/useRooms',
  
  useContractTemplates: '@/src/features/finance/hooks/useContracts',
  useDepositContracts: '@/src/features/finance/hooks/useContracts',
  useRentalContracts: '@/src/features/finance/hooks/useContracts',
  
  useEmployees: '@/src/features/staff/hooks/useStaff',
  useAppointments: '@/src/features/staff/hooks/useStaff',
  useProfiles: '@/src/features/staff/hooks/useStaff',
  
  useManagers: '@/src/features/managers/hooks/useManagers',
  
  usePriceRanges: '@/src/features/categories/hooks/useCategories',
  useAmenities: '@/src/features/categories/hooks/useCategories',
  useRoomTypesCatalog: '@/src/features/categories/hooks/useCategories',
  useVnProvinces: '@/src/features/categories/hooks/useCategories',
  useVnDistricts: '@/src/features/categories/hooks/useCategories',
  useVnWards: '@/src/features/categories/hooks/useCategories'
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDirs = ['app', 'src', 'components'];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  walkDir(dir, filePath => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = /import\s+\{([^}]+)\}\s+from\s+['"]@\/lib\/hooks\/useEntities['"]/g;
    
    let hasChanges = false;
    let newContent = content.replace(regex, (match, importsStr) => {
      hasChanges = true;
      const imports = importsStr.split(',').map(i => i.trim()).filter(i => i);
      const groups = {};
      
      imports.forEach(imp => {
        // e.g. useBuildings, or useBuildings as something
        const hookName = imp.split(/\s+as\s+/)[0];
        const dest = hookMap[hookName];
        if (dest) {
          if (!groups[dest]) groups[dest] = [];
          groups[dest].push(imp);
        } else {
          console.warn(`Hook ${hookName} not found in map for file ${filePath}`);
          if (!groups['@/lib/hooks/useEntities']) groups['@/lib/hooks/useEntities'] = [];
          groups['@/lib/hooks/useEntities'].push(imp);
        }
      });
      
      let newImportStr = Object.entries(groups).map(([dest, imps]) => {
        return `import { ${imps.join(', ')} } from '${dest}';`;
      }).join('\n');
      return newImportStr;
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, newContent);
      console.log('Updated: ' + filePath);
    }
  });
});
