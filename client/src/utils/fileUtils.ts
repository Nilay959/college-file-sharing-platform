export function fileType(type: string, name?: string): [string, string] {
  const value = (type || "").toLowerCase();
  const ext = name ? name.split(".").pop()?.toLowerCase() || "" : "";
  if (value.includes("pdf") || ext === "pdf") return ["PDF", "pdf"];
  if (
    value.includes("presentation") ||
    value.includes("ppt") ||
    ext.startsWith("ppt")
  )
    return ["PPT", "ppt"];
  if (value.includes("word") || value.includes("doc") || ext.startsWith("doc"))
    return ["DOC", "doc"];
  if (value.includes("sheet") || value.includes("xls") || ext.startsWith("xls"))
    return ["XLS", "xls"];
  if (
    value.includes("image") ||
    ["jpg", "jpeg", "png", "gif", "webp"].some((e) => value.includes(e) || ext === e)
  )
    return ["IMG", "img"];
  return [
    ext.slice(0, 3).toUpperCase() ||
      value.slice(0, 3).toUpperCase() ||
      "FILE",
    "file",
  ];
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function sizeInBytes(value: string): number {
  if (!value) return 0;
  const match = value.match(/([\d.]+)\s*(KB|MB|GB|B)/i);
  if (!match) return 0;
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
  };
  return Number(match[1]) * (units[match[2].toUpperCase()] || 1);
}
