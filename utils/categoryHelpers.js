import CategoryModel from "../models/category.model.js";
import ProductModel from "../models/product.model.js";
import { formatCategory } from "./formatters.js";

export function buildCategoryTree(flatCategories) {
  const nodeMap = new Map();

  flatCategories.forEach((category) => {
    nodeMap.set(category.id, {
      ...category,
      children: [],
    });
  });

  const roots = [];

  flatCategories.forEach((category) => {
    const node = nodeMap.get(category.id);

    if (category.parentId) {
      const parent = nodeMap.get(category.parentId);

      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes) => {
    nodes.sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        Number(a.id) - Number(b.id),
    );
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);

  return roots;
}

export function rollupProductCounts(nodes, countMap) {
  return nodes.map((node) => {
    const children = rollupProductCounts(node.children, countMap);
    const directCount = countMap[Number(node.id)] || 0;
    const childrenCount = children.reduce(
      (sum, child) => sum + child.productCount,
      0,
    );

    return {
      ...node,
      children,
      productCount: directCount + childrenCount,
    };
  });
}

export async function getProductCountMap() {
  const rows = await ProductModel.aggregate([
    { $match: { isActive: true, categoryId: { $ne: null } } },
    { $group: { _id: "$categoryId", count: { $sum: 1 } } },
  ]);

  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

export async function getCategoryIdsWithDescendants(categoryId) {
  const categories = await CategoryModel.find({ isActive: true }).select(
    "categoryId parentId",
  );

  const childrenMap = new Map();

  categories.forEach((category) => {
    if (category.parentId == null) return;

    const siblings = childrenMap.get(category.parentId) || [];
    siblings.push(category.categoryId);
    childrenMap.set(category.parentId, siblings);
  });

  const ids = new Set([categoryId]);
  const queue = [categoryId];

  while (queue.length > 0) {
    const current = queue.shift();
    const children = childrenMap.get(current) || [];

    children.forEach((childId) => {
      if (!ids.has(childId)) {
        ids.add(childId);
        queue.push(childId);
      }
    });
  }

  return [...ids];
}

export async function buildCategoryTreeFromDb() {
  const categories = await CategoryModel.find({ isActive: true }).sort({
    sortOrder: 1,
    categoryId: 1,
  });

  const countMap = await getProductCountMap();
  const flat = categories.map((category) => ({
    ...formatCategory(category),
    productCount: countMap[category.categoryId] || 0,
  }));

  return rollupProductCounts(buildCategoryTree(flat), countMap);
}
