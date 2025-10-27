import { tenantHttp, toQueryString, resolveSiteCode } from "./client.js";

const withSite = (siteCode) => resolveSiteCode(siteCode);

const shapeCategory = (doc) => ({
  id: doc._id || doc.id,
  name: doc.name,
  slug: doc.slug,
  parentId: doc.parentId || null,
  parent: doc.parentId || null,
  order: doc.order ?? 0,
  level: doc.level ?? 0,
  ancestors: Array.isArray(doc.ancestors)
    ? doc.ancestors.map((val) => val?.toString?.() || String(val))
    : [],
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const buildTree = (items = []) => {
  const nodes = items.map((item) => ({
    ...shapeCategory(item),
    id: String(item._id || item.id),
    parentId: item.parentId ? String(item.parentId) : null,
    children: [],
    level: 0,
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots = [];

  nodes.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      const parent = byId.get(node.parentId);
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      node.parentId = null;
      node.level = 0;
      roots.push(node);
    }
  });

  const sortNodes = (arr) => {
    arr.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    arr.forEach((child) => sortNodes(child.children));
  };

  sortNodes(roots);
  return roots;
};

export const categoryApi = {
  async list(params = {}, options = {}) {
    const { siteCode: siteOverride, ...query } = params;
    const siteCode = withSite(siteOverride || options.siteCode);
    const qs = toQueryString(query);
    const data = await tenantHttp(siteCode, `/categories${qs}`, {
      auth: options.auth ?? false,
    });
    return (data.categories || []).map(shapeCategory);
  },
  async tree(params = {}, options = {}) {
    const { siteCode: siteOverride, ...query } = params;
    const siteCode = withSite(siteOverride || options.siteCode);
    const qs = toQueryString(query);
    const data = await tenantHttp(siteCode, `/categories${qs}`, {
      auth: options.auth ?? false,
    });
    return buildTree(data.categories || []);
  },
  async get(idOrSlug, options = {}) {
    const siteCode = withSite(options.siteCode);
    const data = await tenantHttp(siteCode, `/categories/${idOrSlug}`, {
      auth: options.auth ?? false,
    });
    return shapeCategory(data.category);
  },
  async create(payload, options = {}) {
    const siteCode = withSite(options.siteCode);
    const body = {
      name: String(payload.name || "").trim(),
      parentId: payload.parentId ?? payload.parent ?? "",
    };
    if (payload.order !== undefined) {
      body.order = Number(payload.order);
    }
    const data = await tenantHttp(siteCode, "/categories", {
      method: "POST",
      body,
      auth: options.auth ?? true,
    });
    return shapeCategory(data.category);
  },
  async update(id, payload, options = {}) {
    const siteCode = withSite(options.siteCode);
    const body = {};
    if (payload.name !== undefined) {
      body.name = String(payload.name || "").trim();
    }
    if (payload.parentId !== undefined || payload.parent !== undefined) {
      const parentId = payload.parentId ?? payload.parent ?? "";
      body.parentId = parentId || "";
    }
    if (payload.order !== undefined) {
      body.order = Number(payload.order);
    }
    const data = await tenantHttp(siteCode, `/categories/${id}`, {
      method: "PUT",
      body,
      auth: options.auth ?? true,
    });
    return shapeCategory(data.category);
  },
  async remove(id, options = {}) {
    const siteCode = withSite(options.siteCode);
    return tenantHttp(siteCode, `/categories/${id}`, {
      method: "DELETE",
      auth: options.auth ?? true,
    });
  },
};
