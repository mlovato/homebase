import type Database from "better-sqlite3";
import { getAdminUser } from "@/lib/repositories/users";
import { getAllLinks } from "@/lib/repositories/links";

export interface ServiceEntry {
  name: string;
  url: string;
  url_alt: string | null;
}

export function handleGetServices(db: Database.Database): ServiceEntry[] {
  const admin = getAdminUser(db);
  if (!admin) return [];
  return getAllLinks(db, admin.id).map(({ name, url, url_alt }) => ({
    name,
    url,
    url_alt,
  }));
}
