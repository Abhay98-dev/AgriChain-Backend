const quantityToKg = (quantity, unit) => {
  if (unit === "quintal") {
    return quantity * 100;
  }

  return quantity;
};

const hasWarehouseCapacity = (warehouse, quantityKg) => {
  const currentLoadKg = warehouse.currentLoadKg || 0;
  return currentLoadKg + quantityKg <= warehouse.capacityKg;
};

const increaseWarehouseInventory = (warehouse, cropType, quantityKg) => {
  warehouse.currentLoadKg = (warehouse.currentLoadKg || 0) + quantityKg;

  const existingItem = warehouse.inventory.find(
    item => item.cropType.toLowerCase() === cropType.toLowerCase()
  );

  if (existingItem) {
    existingItem.quantityKg += quantityKg;
    return;
  }

  warehouse.inventory.push({
    cropType,
    quantityKg
  });
};

const decreaseWarehouseInventory = (warehouse, cropType, quantityKg) => {
  warehouse.currentLoadKg = Math.max(
    0,
    (warehouse.currentLoadKg || 0) - quantityKg
  );

  const existingItem = warehouse.inventory.find(
    item => item.cropType.toLowerCase() === cropType.toLowerCase()
  );

  if (!existingItem) {
    return;
  }

  existingItem.quantityKg = Math.max(0, existingItem.quantityKg - quantityKg);

  warehouse.inventory = warehouse.inventory.filter(
    item => item.quantityKg > 0
  );
};

module.exports = {
  quantityToKg,
  hasWarehouseCapacity,
  increaseWarehouseInventory,
  decreaseWarehouseInventory
};
